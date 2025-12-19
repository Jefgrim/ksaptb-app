import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // 1. Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user) {
      // --- NEW: UPDATE LOGIC ---
      // If the name in Clerk is different from the DB, update the DB.
      if (user.name !== identity.name || user.email !== args.email) {
        await ctx.db.patch(user._id, {
          name: identity.name,
          email: args.email,
        });
      }
      return user._id;
    }

    // 2. If not, create new user
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