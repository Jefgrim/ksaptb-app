import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./auth";

export const getMyBookings = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return [];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Join with Tour data AND generate Image URL
    const bookingsWithTour = await Promise.all(
      bookings.map(async (booking) => {
        const tour = await ctx.db.get(booking.tourId);

        // --- NEW CODE START ---
        let imageUrl = null;
        if (tour && tour.coverImageId) {
          // Convert the Storage ID (internal) to a URL (public)
          imageUrl = await ctx.storage.getUrl(tour.coverImageId);
        }
        // --- NEW CODE END ---

        return {
          ...booking,
          // We attach the new imageUrl to the tour object
          tour: tour ? { ...tour, imageUrl } : null
        };
      })
    );

    return bookingsWithTour;
  },
});

// ... (Keep your cancelBooking and getAllBookings functions exactly the same)
export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    // 1. Get the current user
    const user = await requireUser(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");

    // 2. Authorization: Only the Owner OR an Admin can cancel
    if (booking.userId !== user._id && user.role !== "admin") {
      throw new ConvexError("You do not have permission to cancel this booking.");
    }

    if (booking.status === "cancelled") {
      throw new ConvexError("Booking is already cancelled.");
    }

    // 3. Mark as cancelled
    await ctx.db.patch(args.bookingId, { status: "cancelled" });

    // 4. Refund the spot
    const tour = await ctx.db.get(booking.tourId);
    if (tour) {
      await ctx.db.patch(tour._id, {
        bookedCount: Math.max(0, tour.bookedCount - 1),
      });
    }
  },
});

export const getAllBookings = query({
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").order("desc").collect();

    return bookings.map((b) => ({
      _id: b._id,
      status: b.status,
      ticketCount: b.ticketCount,

      // Directly use the snapshots!
      // Even if the User or Tour is deleted, this data remains.
      userName: b.userName,
      userEmail: b.userEmail,
      tourTitle: b.tourTitle,
      tourDate: b.tourDate,
      totalPrice: (b.tourPrice * (b.ticketCount ?? 1)),
    }));
  },
});