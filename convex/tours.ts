import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. List all tours
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("tours").collect();
  },
});

// 2. Get single tour
export const get = query({
  args: { id: v.id("tours") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 3. Admin: Create Tour
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    price: v.number(),
    startDate: v.number(),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if(!identity) throw new Error("Unauthorized");

    // In a real app, verify user.role === 'admin' here using a helper

    return await ctx.db.insert("tours", {
      ...args,
      bookedCount: 0,
    });
  },
});

// 4. BOOK TOUR (Transaction Logic)
export const book = mutation({
  args: { tourId: v.id("tours") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Please log in");

    // Get the internal User ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found in DB");

    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new Error("Tour not found");

    // RACE CONDITION CHECK
    if (tour.bookedCount >= tour.capacity) {
      throw new Error("Tour is sold out");
    }

    // Create Booking
    await ctx.db.insert("bookings", {
      tourId: tour._id,
      userId: user._id,
      status: "confirmed",
    });

    // Increment Count
    await ctx.db.patch(tour._id, {
      bookedCount: tour.bookedCount + 1,
    });
  },
});