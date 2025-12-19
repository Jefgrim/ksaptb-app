import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./auth"; // Import our new helpers


// 1. Helper to generate a URL for uploading files
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// 1. List all tours
export const list = query({
  handler: async (ctx) => {
    const tours = await ctx.db.query("tours").collect();

    // Convert Storage ID to a viewable URL for every tour
    return await Promise.all(
      tours.map(async (tour) => ({
        ...tour,
        imageUrl: tour.coverImageId
          ? await ctx.storage.getUrl(tour.coverImageId)
          : null,
      }))
    );
  },
});

// 2. Get single tour
export const get = query({
  args: { id: v.id("tours") },
  handler: async (ctx, args) => {
    const tour = await ctx.db.get(args.id);
    if (!tour) return null;

    // Resolve Cover Image URL
    const coverUrl = tour.coverImageId
      ? await ctx.storage.getUrl(tour.coverImageId)
      : null;

    // Resolve Gallery Image URLs (concurrently for speed)
    const galleryUrls = tour.galleryImageIds
      ? await Promise.all(
        tour.galleryImageIds.map((id) => ctx.storage.getUrl(id))
      )
      : [];

    return {
      ...tour,
      imageUrl: coverUrl, // Keep backward compatibility for homepage
      galleryUrls: galleryUrls.filter(url => url !== null), // Ensure no nulls
    };
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
    coverImageId: v.optional(v.id("_storage")),
    galleryImageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    // ONE LINE SECURITY CHECK
    await requireAdmin(ctx);

    // In a real app, verify user.role === 'admin' here using a helper

    return await ctx.db.insert("tours", {
      ...args,
      bookedCount: 0,
      galleryImageIds: args.galleryImageIds || [],
    });
  },
});

// 4. BOOK TOUR (Transaction Logic)
export const book = mutation({
  args: { tourId: v.id("tours") },
  handler: async (ctx, args) => {

    // Verify User
    const user = await requireUser(ctx);

    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new Error("Tour not found");

    // RACE CONDITION CHECK
    if (tour.bookedCount >= tour.capacity) {
      throw new ConvexError("Sorry, this tour is sold out.");
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

// ... existing code ...

// 5. ADMIN: Delete Tour
export const deleteTour = mutation({
  args: { id: v.id("tours") },
  handler: async (ctx, args) => {
    // 1. Security Check
    await requireAdmin(ctx);

    // 2. Delete the tour doc
    await ctx.db.delete(args.id);

    // Note: In a production app, you might also want to 
    // delete the associated images from storage here to save space.
  },
});

// 6. ADMIN: Update Tour
export const update = mutation({
  args: {
    id: v.id("tours"),
    // All fields are optional because we might only change one
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    capacity: v.optional(v.number()),
    startDate: v.optional(v.number()),
    // We won't touch images in this simple edit version to keep it stable
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await requireAdmin(ctx);
    await ctx.db.patch(id, fields);
  },
});