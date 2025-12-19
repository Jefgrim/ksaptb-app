import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./auth"; 

export const getMyBookings = query({
  handler: async (ctx) => {
    // We don't throw error here, just return empty list if not logged in
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

    // Join with Tour data
    const bookingsWithTour = await Promise.all(
      bookings.map(async (booking) => {
        const tour = await ctx.db.get(booking.tourId);
        return { ...booking, tour };
      })
    );

    return bookingsWithTour;
  },
});

// SECURED CANCEL
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

// SECURED ADMIN LIST
export const getAllBookings = query({
  handler: async (ctx) => {
    // 1. Security Check
    await requireAdmin(ctx);

    const bookings = await ctx.db.query("bookings").order("desc").collect();

    return await Promise.all(
      bookings.map(async (b) => {
        const tour = await ctx.db.get(b.tourId);
        const user = await ctx.db.get(b.userId);
        return {
          ...b,
          tourTitle: tour?.title || "Unknown Tour",
          userName: user?.name || user?.email || "Unknown User",
          userEmail: user?.email,
        };
      })
    );
  },
});