import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("customer")),
  }).index("by_token", ["tokenIdentifier"]),

  tours: defineTable({
    title: v.string(),
    description: v.string(),
    price: v.number(), // stored in Halalas/Cents
    startDate: v.number(),
    capacity: v.number(),
    bookedCount: v.number(),
    coverImageId: v.optional(v.id("_storage")),
    galleryImageIds: v.optional(v.array(v.id("_storage"))),
  }),

  bookings: defineTable({
    tourId: v.id("tours"),
    userId: v.id("users"),
    ticketCount: v.number(),

    // Snapshots
    userName: v.string(),
    userEmail: v.string(),
    tourTitle: v.string(),
    tourDate: v.number(),
    tourPrice: v.number(),

    // Payment Logic
    // "holding" = Reserved for 10 mins, waiting for payment
    // "expired" = User didn't pay in time, seat released
    status: v.union(
      v.literal("holding"),
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("rejected"),
    ),

    paymentMethod: v.union(v.literal("stripe"), v.literal("transfer")),
    paymentStatus: v.string(), // pending, reviewing, paid, rejected

    proofImageId: v.optional(v.id("_storage")),
    refundDetails: v.optional(v.string()),

    // NEW: When does the hold expire?
    expiresAt: v.optional(v.number()),

    redeemedTickets: v.optional(v.array(v.number())),
  })
    .index("by_tour", ["tourId"])
    .index("by_user", ["userId"])
    // Important: Index to find expired bookings quickly
    .index("by_holding", ["status", "expiresAt"]),
});