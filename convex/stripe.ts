"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

// Initialize Stripe ONLY if key exists, preventing crashes during dev
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" as any })
  : null;

export const createCheckoutSession = action({
  args: { bookingId: v.id("bookings"), title: v.string(), priceInCents: v.number(), count: v.number() },
  handler: async (ctx, args) => {
    if (!stripe) throw new Error("Stripe not configured");

    const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      line_items: [{
          price_data: {
            currency: "sar",
            product_data: { name: args.title },
            unit_amount: args.priceInCents,
          },
          quantity: args.count,
      }],
      mode: "payment",
      success_url: `${domain}/bookings?success=true`,
      cancel_url: `${domain}/tours`,
      metadata: { bookingId: args.bookingId },
    });
    return session.url;
  },
});