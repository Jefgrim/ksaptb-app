import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user) return user._id;

    // Create new user if doesn't exist
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.subject,
      email: args.email,
      role: "customer", // Default role
      name: identity.name,
    });
  },
});

export const current = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
  }
});