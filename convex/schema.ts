import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(), // Clerk User ID
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("customer")),
  }).index("by_token", ["tokenIdentifier"]),

  tours: defineTable({
    title: v.string(),
    description: v.string(),
    price: v.number(), // in cents
    startDate: v.number(), // unix timestamp
    capacity: v.number(),
    bookedCount: v.number(),
    coverImageId: v.optional(v.id("_storage")),
    galleryImageIds: v.optional(v.array(v.id("_storage"))),
  }),

  bookings: defineTable({
    tourId: v.id("tours"),
    userId: v.id("users"),
    ticketCount: v.number(),
    status: v.string(), // "confirmed"
    userName: v.string(), 
    userEmail: v.string(),
  }).index("by_tour", ["tourId"]).index("by_user", ["userId"]),
});