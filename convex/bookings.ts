import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./auth";

// --------------------------------------------------------------------------
// QUERIES
// --------------------------------------------------------------------------

export const getBookingsByTour = query({
  args: { tourId: v.id("tours") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_tour", (q) => q.eq("tourId", args.tourId))
      .collect();

    // Map over bookings to generate URLs
    return Promise.all(
      bookings.map(async (b) => {
        let proofUrl = null;
        // If there is a proofImageId (Admin Refund) or paymentImageId (User Payment)
        // You might want to return URLs for both
        if (b.proofImageId) {
          proofUrl = await ctx.storage.getUrl(b.proofImageId);
        }

        return {
          ...b,
          proofUrl, // <--- This is what the UI uses
        };
      })
    );
  },
});

// 1. Get My Bookings (Standard)
export const getMyBookings = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return [];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc") // Recommended: Newest first
      .collect();

    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        // 1. Get Tour Details & Cover Image
        const tour = await ctx.db.get(booking.tourId);
        let imageUrl = null;
        if (tour && tour.coverImageId) {
          imageUrl = await ctx.storage.getUrl(tour.coverImageId);
        }

        // 2. Get Admin Refund Proof URL (CRITICAL FIX)
        let adminRefundProofUrl = null;
        if (booking.adminRefundProofId) {
          adminRefundProofUrl = await ctx.storage.getUrl(booking.adminRefundProofId);
        }

        return {
          ...booking,
          adminRefundProofUrl, // <--- Passing this to the frontend now
          tour: tour ? { ...tour, imageUrl } : null
        };
      })
    );

    return bookingsWithDetails;
  },
});

// 2. Get Active Holding (For RESUMING a session)
export const getMyActiveHolding = query({
  args: { tourId: v.id("tours") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Find a booking for this user + tour that is "holding" and NOT expired
    const holding = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("tourId"), args.tourId),
          q.eq(q.field("status"), "holding"),
          q.gt(q.field("expiresAt"), now) // Must still have time left
        )
      )
      .first();

    return holding; // Returns null if no active session
  }
});

// 3. Admin Queries (Keep existing)
export const getAllBookings = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const bookings = await ctx.db.query("bookings").order("desc").collect();
    return bookings.map((b) => ({
      _id: b._id,
      status: b.status,
      ticketCount: b.ticketCount,
      paymentStatus: b.paymentStatus,
      userName: b.userName,
      userEmail: b.userEmail,
      tourTitle: b.tourTitle,
      tourDate: b.tourDate,
      totalPrice: (b.tourPrice * (b.ticketCount ?? 1)),
    }));
  },
});

export const getBookingForAdmin = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;
    let proofUrl = null;
    if (booking.proofImageId) proofUrl = await ctx.storage.getUrl(booking.proofImageId);
    return { ...booking, proofUrl };
  },
});

// --------------------------------------------------------------------------
// MUTATIONS
// --------------------------------------------------------------------------

// 4. RESERVE (Step 1: Lock the spot)
export const reserve = mutation({
  args: {
    tourId: v.id("tours"),
    ticketCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new ConvexError("Tour not found");

    // Check Capacity
    if (tour.bookedCount + args.ticketCount > tour.capacity) {
      throw new ConvexError("Sold out");
    }

    // 1. LOCK SEATS
    await ctx.db.patch(tour._id, {
      bookedCount: tour.bookedCount + args.ticketCount,
    });

    // 2. CREATE "HOLDING" BOOKING
    // 15 Minutes Expiration
    const EXPIRE_TIME = 15 * 60 * 1000;

    const bookingId = await ctx.db.insert("bookings", {
      tourId: tour._id,
      userId: user._id,
      ticketCount: args.ticketCount,
      userName: user.name || "Guest",
      userEmail: user.email,
      tourTitle: tour.title,
      tourDate: tour.startDate,
      tourPrice: tour.price,

      status: "holding",
      expiresAt: Date.now() + EXPIRE_TIME,

      // Defaults until they finish Step 2
      paymentMethod: "transfer",
      paymentStatus: "pending",
    });

    return { bookingId, expiresAt: Date.now() + EXPIRE_TIME };
  },
});

// 5. CONFIRM (Step 2: Finalize)
export const confirm = mutation({
  args: {
    bookingId: v.id("bookings"),
    paymentMethod: v.union(v.literal("stripe"), v.literal("transfer")),
    proofImageId: v.optional(v.id("_storage")),
    refundDetails: v.optional(v.string()),
    contactNumber: v.string(), // NEW: Required
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.userId !== user._id) throw new ConvexError("Unauthorized");

    if (booking.status === "expired") {
      throw new ConvexError("Reservation expired. Please book again.");
    }

    const paymentStatus = (args.paymentMethod === "transfer" && args.proofImageId)
      ? "reviewing"
      : "pending";

    await ctx.db.patch(args.bookingId, {
      status: "pending",
      expiresAt: undefined,
      paymentMethod: args.paymentMethod,
      paymentStatus: paymentStatus,
      proofImageId: args.proofImageId,
      refundDetails: args.refundDetails,
      contactNumber: args.contactNumber, // Saved
    });
  }
});

// 6. CLEANUP (Cron Job)
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredBookings = await ctx.db
      .query("bookings")
      .withIndex("by_holding", (q) => q.eq("status", "holding"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const booking of expiredBookings) {
      // NEW: Mark both booking status AND payment status as expired
      await ctx.db.patch(booking._id, {
        status: "expired",
        paymentStatus: "expired"
      });

      const tour = await ctx.db.get(booking.tourId);
      if (tour) {
        await ctx.db.patch(tour._id, {
          bookedCount: Math.max(0, tour.bookedCount - booking.ticketCount)
        });
      }
    }
  }
});

// 7. Verify Payment (Admin)
export const verifyPayment = mutation({
  args: { bookingId: v.id("bookings"), action: v.union(v.literal("approve"), v.literal("reject")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");

    // SAFETY CHECK: Prevent double processing
    if (booking.paymentStatus === "paid" || booking.paymentStatus === "rejected") {
      throw new ConvexError(`This booking has already been ${booking.paymentStatus}.`);
    }

    if (args.action === "approve") {
      await ctx.db.patch(args.bookingId, {
        status: "confirmed",
        paymentStatus: "paid",
      });
    } else {
      // If rejected, free the seats
      const tour = await ctx.db.get(booking.tourId);

      // Only return seats if the booking wasn't already rejected
      if (tour && booking.status !== "rejected") {
        await ctx.db.patch(tour._id, {
          bookedCount: Math.max(0, tour.bookedCount - booking.ticketCount)
        });
      }

      await ctx.db.patch(args.bookingId, {
        status: "rejected",
        paymentStatus: "rejected",
      });
    }
  }
});

// 8. Cancel Booking (User)
export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");

    if (booking.userId !== user._id && user.role !== "admin") throw new ConvexError("Unauthorized");
    if (booking.status === "expired") throw new ConvexError("Already expired");

    await ctx.db.patch(args.bookingId, { status: "expired", paymentStatus: "expired" });

    const tour = await ctx.db.get(booking.tourId);
    if (tour) {
      await ctx.db.patch(tour._id, {
        bookedCount: Math.max(0, tour.bookedCount - booking.ticketCount),
      });
    }
  },
});

// --------------------------------------------------------------------------
// 9. SCAN TICKET (New)
// --------------------------------------------------------------------------
export const validateTicket = mutation({
  args: {
    bookingId: v.id("bookings"),
    ticketNumber: v.number()
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking ID not found");

    // 1. Check if Booking is Valid
    if (booking.status !== "confirmed") {
      return {
        valid: false,
        message: `Booking is ${booking.status.toUpperCase()}`,
        booking
      };
    }

    // 2. Check if Ticket Number exists in this booking (e.g. Booking has 2 tix, scanning Ticket #99)
    if (args.ticketNumber < 1 || args.ticketNumber > booking.ticketCount) {
      return {
        valid: false,
        message: "Invalid Ticket Number",
        booking
      };
    }

    // 3. Check if ALREADY redeemed
    const redeemed = booking.redeemedTickets || [];
    if (redeemed.includes(args.ticketNumber)) {
      return {
        valid: false,
        message: "ALREADY REDEEMED",
        alreadyRedeemed: true,
        booking
      };
    }

    // 4. Success: Mark as redeemed
    await ctx.db.patch(args.bookingId, {
      redeemedTickets: [...redeemed, args.ticketNumber]
    });

    return {
      valid: true,
      message: "Access Granted",
      booking
    };
  }
});

export const processAdminRefund = mutation({
  args: {
    bookingId: v.id("bookings"),
    proofImageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");

    // Update status to 'refunded'
    await ctx.db.patch(args.bookingId, {
      status: "refunded",
      paymentStatus: "refunded",
      adminRefundProofId: args.proofImageId
    });
  }
});