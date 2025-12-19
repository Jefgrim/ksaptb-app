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
  args: { 
    tourId: v.id("tours"),
    ticketCount: v.number(), // <--- NEW ARGUMENT
  },
  handler: async (ctx, args) => {
    // Verify User
    const user = await requireUser(ctx);

    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new Error("Tour not found");

    // NEW CHECK: Ensure enough capacity for the requested amount
    if (tour.bookedCount + args.ticketCount > tour.capacity) {
      throw new ConvexError(`Not enough spots. Only ${tour.capacity - tour.bookedCount} left.`);
    }

    // Create Booking with ticket count
    await ctx.db.insert("bookings", {
      tourId: tour._id,
      userId: user._id,
      ticketCount: args.ticketCount,
      status: "confirmed",
    });

    // Increment Tour Count by the number of tickets bought
    await ctx.db.patch(tour._id, {
      bookedCount: tour.bookedCount + args.ticketCount,
    });
  },
});

// ... existing code ...

// 5. ADMIN: Delete Tour (WITH IMAGE CLEANUP)
export const deleteTour = mutation({
  args: { id: v.id("tours") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // 1. Fetch the tour first so we know which images to delete
    const tour = await ctx.db.get(args.id);
    if (!tour) return; // Already deleted?

    // 2. Delete the Cover Image
    if (tour.coverImageId) {
      await ctx.storage.delete(tour.coverImageId);
    }

    // 3. Delete the Gallery Images
    if (tour.galleryImageIds) {
      for (const imageId of tour.galleryImageIds) {
        await ctx.storage.delete(imageId);
      }
    }

    // 4. Finally, delete the database record
    await ctx.db.delete(args.id);
  },
});

// 6. ADMIN: Update Tour (WITH IMAGE REPLACEMENT CLEANUP)
export const update = mutation({
  args: {
    id: v.id("tours"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    capacity: v.optional(v.number()),
    startDate: v.optional(v.number()),
    coverImageId: v.optional(v.id("_storage")), // The NEW image ID
    galleryImageIds: v.optional(v.array(v.id("_storage"))), // The NEW gallery IDs
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await requireAdmin(ctx);

    const tour = await ctx.db.get(id);
    if (!tour) throw new ConvexError("Tour not found");

    // 1. Handle Cover Image Replacement
    // If a NEW cover image is provided, delete the OLD one.
    if (fields.coverImageId && tour.coverImageId) {
      // Check to ensure we aren't accidentally deleting the same image 
      // (unlikely, but good safety)
      if (fields.coverImageId !== tour.coverImageId) {
        await ctx.storage.delete(tour.coverImageId);
      }
    }

    // 2. Handle Gallery Replacement
    // If a NEW gallery is provided, delete ALL old gallery images.
    if (fields.galleryImageIds && tour.galleryImageIds) {
      for (const oldImageId of tour.galleryImageIds) {
         await ctx.storage.delete(oldImageId);
      }
    }

    // 3. Update the database document
    await ctx.db.patch(id, fields);
  },
});