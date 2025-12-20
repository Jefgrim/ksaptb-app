import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./auth";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// HELPER: Get start of today in KSA (as timestamp)
function getKsaToday() {
  const ksaString = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
  return new Date(`${ksaString}T00:00:00+03:00`).getTime();
}

// 1. ADMIN LIST (Shows ALL tours, even past ones, so you can manage them)
export const list = query({
  handler: async (ctx) => {
    const tours = await ctx.db.query("tours").collect();

    // Filter out soft-deleted tours if you implemented that previously
    // const activeTours = tours.filter(t => !t.isDeleted); 

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

// 1.5. PUBLIC LIST (Shows ONLY Upcoming tours)
export const listUpcoming = query({
  handler: async (ctx) => {
    const tours = await ctx.db.query("tours").collect();
    const now = Date.now();

    // FILTER: Start Date must be in the future
    const upcomingTours = tours.filter(tour => tour.startDate >= now);

    return await Promise.all(
      upcomingTours.map(async (tour) => ({
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

    const coverUrl = tour.coverImageId
      ? await ctx.storage.getUrl(tour.coverImageId)
      : null;

    const galleryUrls = tour.galleryImageIds
      ? await Promise.all(
        tour.galleryImageIds.map((id) => ctx.storage.getUrl(id))
      )
      : [];

    return {
      ...tour,
      imageUrl: coverUrl,
      galleryUrls: galleryUrls.filter(url => url !== null),
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
    await requireAdmin(ctx);

    const ksaToday = getKsaToday();

    // We allow a small buffer (e.g., creating a tour for "today" is okay)
    // but strictly speaking, args.startDate (00:00 KSA) should be >= ksaToday
    if (args.startDate < ksaToday) {
      throw new ConvexError("Cannot create a tour in the past (Saudi Time).");
    }

    return await ctx.db.insert("tours", {
      ...args,
      bookedCount: 0,
      galleryImageIds: args.galleryImageIds || [],
    });
  },
});

// 4. BOOK TOUR
export const book = mutation({
  args: {
    tourId: v.id("tours"),
    ticketCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new Error("Tour not found");

    // OPTIONAL: Prevent booking if the tour has already started/passed
    if (tour.startDate < Date.now()) {
      throw new ConvexError("This tour has already started or ended.");
    }

    if (tour.bookedCount + args.ticketCount > tour.capacity) {
      throw new ConvexError("Not enough spots left.");
    }

    await ctx.db.insert("bookings", {
      tourId: tour._id,
      userId: user._id,
      ticketCount: args.ticketCount,
      status: "confirmed",
      userName: user.name || "Anonymous",
      userEmail: user.email || "No Email",
      tourTitle: tour.title,
      tourDate: tour.startDate,
      tourPrice: tour.price,
    });

    await ctx.db.patch(tour._id, {
      bookedCount: tour.bookedCount + args.ticketCount,
    });
  },
});

// 5. ADMIN: Delete Tour
export const deleteTour = mutation({
  args: { id: v.id("tours") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tour", (q) => q.eq("tourId", args.id))
      .collect();

    const activeBookings = bookings.filter(b => b.status !== "cancelled");

    if (activeBookings.length > 0) {
      throw new ConvexError("Cannot delete this tour because it has active bookings. Cancel them first.");
    }

    const tour = await ctx.db.get(args.id);
    if (!tour) return;

    if (tour.coverImageId) await ctx.storage.delete(tour.coverImageId);
    if (tour.galleryImageIds) {
      for (const imageId of tour.galleryImageIds) {
        await ctx.storage.delete(imageId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

// 6. ADMIN: Update Tour
export const update = mutation({
  args: {
    id: v.id("tours"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    capacity: v.optional(v.number()),
    startDate: v.optional(v.number()),
    coverImageId: v.optional(v.id("_storage")),
    galleryImageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await requireAdmin(ctx);

    const tour = await ctx.db.get(id);
    if (!tour) throw new ConvexError("Tour not found");

    // VALIDATION: Prevent updating to a past date
    if (fields.startDate) {
      const ksaToday = getKsaToday();
      if (fields.startDate < ksaToday) {
        throw new ConvexError("Cannot move a tour to the past (Saudi Time).");
      }
    }

    if (fields.coverImageId && tour.coverImageId && fields.coverImageId !== tour.coverImageId) {
      await ctx.storage.delete(tour.coverImageId);
    }

    if (fields.galleryImageIds && tour.galleryImageIds) {
      for (const oldImageId of tour.galleryImageIds) {
        await ctx.storage.delete(oldImageId);
      }
    }

    await ctx.db.patch(id, fields);
  },
});