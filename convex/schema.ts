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
    price: v.number(),
    startDate: v.number(),
    capacity: v.number(),
    bookedCount: v.number(),
    coverImageId: v.optional(v.id("_storage")),
    galleryImageIds: v.optional(v.array(v.id("_storage"))),
    
    // Track if tour is cancelled by admin
    cancelled: v.optional(v.boolean()), 
    
    // --- NEW FIELD ---
    // This allows the Cron job to mark a tour as "finished"
    // so it becomes read-only and unbookable.
    isCompleted: v.optional(v.boolean()), 
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

    status: v.union(
      v.literal("holding"),
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"), // User cancelled
      v.literal("expired"),   // System expired
      v.literal("rejected"),  // Admin rejected
      v.literal("refunded"),  // Admin cancelled tour & refunded user
    ),

    paymentMethod: v.union(v.literal("stripe"), v.literal("transfer")),
    paymentStatus: v.string(), 

    // User inputs
    proofImageId: v.optional(v.id("_storage")),
    refundDetails: v.optional(v.string()), 
    contactNumber: v.optional(v.string()), 

    // Admin Refund Logic (For Cancelled Tours)
    adminRefundProofId: v.optional(v.id("_storage")), 
    
    expiresAt: v.optional(v.number()),
    redeemedTickets: v.optional(v.array(v.number())),
  })
    .index("by_tour", ["tourId"])
    .index("by_user", ["userId"])
    .index("by_holding", ["status", "expiresAt"]),
});