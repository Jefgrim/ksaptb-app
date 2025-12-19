import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Get bookings for the logged-in user (with Tour details)
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

export const cancelBooking = mutation({
    args: { bookingId: v.id("bookings") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const booking = await ctx.db.get(args.bookingId);
        if (!booking) throw new Error("Booking not found");

        // Verify ownership (or if admin)
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
            .unique();

        if (!user || (user._id !== booking.userId && user.role !== "admin")) {
            throw new Error("You cannot cancel this booking");
        }

        if (booking.status === "cancelled") {
            throw new Error("Booking already cancelled");
        }

        // 1. Mark as cancelled
        await ctx.db.patch(args.bookingId, { status: "cancelled" });

        // 2. Free up the spot on the tour
        const tour = await ctx.db.get(booking.tourId);
        if (tour) {
            await ctx.db.patch(tour._id, {
                bookedCount: Math.max(0, tour.bookedCount - 1),
            });
        }
    },
});

// Admin: Get all bookings with user and tour details
export const getAllBookings = query({
    handler: async (ctx) => {
        // Ideally check for admin role here again for security

        const bookings = await ctx.db.query("bookings").order("desc").collect();

        // Join User and Tour
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