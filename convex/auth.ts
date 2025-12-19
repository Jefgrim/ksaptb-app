import { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";

// 1. Helper to ensure user is logged in
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("You must be logged in to perform this action.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("User account not found.");
  }

  return user;
}

// 2. Helper to ensure user is an ADMIN
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);

  if (user.role !== "admin") {
    throw new ConvexError("Access Denied: You do not have admin privileges.");
  }

  return user;
}