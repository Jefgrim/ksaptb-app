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

    return Promise.all(
      bookings.map(async (b) => {
        let proofUrl = null;
        if (b.proofImageId) {
          proofUrl = await ctx.storage.getUrl(b.proofImageId);
        }
        return { ...b, proofUrl };
      })
    );
  },
});

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
      .order("desc")
      .collect();

    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const tour = await ctx.db.get(booking.tourId);
        let imageUrl = null;
        if (tour && tour.coverImageId) {
          imageUrl = await ctx.storage.getUrl(tour.coverImageId);
        }

        let adminRefundProofUrl = null;
        if (booking.adminRefundProofId) {
          adminRefundProofUrl = await ctx.storage.getUrl(booking.adminRefundProofId);
        }

        return {
          ...booking,
          adminRefundProofUrl,
          tour: tour ? { ...tour, imageUrl } : null
        };
      })
    );

    return bookingsWithDetails;
  },
});

export const getMyActiveHolding = query({
  args: { tourId: v.id("tours") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const holding = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("tourId"), args.tourId),
          q.eq(q.field("status"), "holding"),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .first();

    return holding;
  }
});

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
      // Returns TOTAL CENTS
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

export const reserve = mutation({
  args: {
    tourId: v.id("tours"),
    ticketCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tour = await ctx.db.get(args.tourId);
    if (!tour) throw new ConvexError("Tour not found");

    if (tour.bookedCount + args.ticketCount > tour.capacity) {
      throw new ConvexError("Sold out");
    }

    await ctx.db.patch(tour._id, {
      bookedCount: tour.bookedCount + args.ticketCount,
    });

    const EXPIRE_TIME = 15 * 60 * 1000;

    const bookingId = await ctx.db.insert("bookings", {
      tourId: tour._id,
      userId: user._id,
      ticketCount: args.ticketCount,
      userName: user.name || "Guest",
      userEmail: user.email,
      tourTitle: tour.title,
      tourDate: tour.startDate,
      tourPrice: tour.price, // Stored in Cents
      status: "holding",
      expiresAt: Date.now() + EXPIRE_TIME,
      paymentMethod: "transfer",
      paymentStatus: "pending",
      paymentType: tour.paymentOption || "full",
      isSecondPaymentConfirmed: false,
    });

    return { bookingId, expiresAt: Date.now() + EXPIRE_TIME };
  },
});

export const confirm = mutation({
  args: {
    bookingId: v.id("bookings"),
    paymentMethod: v.union(v.literal("stripe"), v.literal("transfer")),
    proofImageId: v.optional(v.id("_storage")),
    refundDetails: v.optional(v.string()),
    contactNumber: v.string(),
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
      contactNumber: args.contactNumber,
    });
  }
});

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

export const verifyPayment = mutation({
  args: { bookingId: v.id("bookings"), action: v.union(v.literal("approve"), v.literal("reject")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");

    if (booking.paymentStatus === "paid" || booking.paymentStatus === "rejected") {
      throw new ConvexError(`This booking has already been ${booking.paymentStatus}.`);
    }

    if (args.action === "approve") {
      await ctx.db.patch(args.bookingId, {
        status: "confirmed",
        paymentStatus: "paid",
      });
    } else {
      const tour = await ctx.db.get(booking.tourId);
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
// 9. SCAN TICKET (SINGLE QR & PAYMENT LOGIC)
// --------------------------------------------------------------------------
export const validateTicket = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking ID not found");

    // 1. Check Status
    if (booking.status !== "confirmed") {
      return {
        valid: false,
        message: `Booking is ${booking.status.toUpperCase()}`,
        booking,
      };
    }

    // 2. Check if ALREADY Checked In
    if (booking.checkedInAt) {
      return {
        valid: false,
        message: "ALREADY USED",
        alreadyRedeemed: true,
        booking,
      };
    }

    // 3. Check Payment Status (Downpayment)
    if (
      booking.paymentType === "downpayment" &&
      !booking.isSecondPaymentConfirmed
    ) {
      // CALCULATION (In Cents)
      // Example: tourPrice 5000 (50 SAR) * 2 tickets = 10000 cents (100 SAR)
      const totalAmountCents = booking.tourPrice * booking.ticketCount;
      const remainingBalanceCents = totalAmountCents / 2;

      return {
        valid: false,
        message: "Second Payment Required",
        requiresSecondPayment: true,
        remainingBalance: remainingBalanceCents, // Returns CENTS
        booking,
      };
    }

    // 4. Success: Mark whole group as Checked In
    await ctx.db.patch(args.bookingId, {
      checkedInAt: Date.now(),
    });

    return {
      valid: true,
      message: "Access Granted",
      booking,
    };
  },
});

export const confirmSecondPayment = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new ConvexError("Booking not found");

    if (booking.paymentType !== "downpayment") {
      throw new ConvexError("This is not a downpayment booking.");
    }

    // Mark payment confirmed AND check them in immediately
    await ctx.db.patch(args.bookingId, {
      isSecondPaymentConfirmed: true,
      checkedInAt: Date.now(),
    });

    return { success: true };
  },
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

    await ctx.db.patch(args.bookingId, {
      status: "refunded",
      paymentStatus: "refunded",
      adminRefundProofId: args.proofImageId,
    });
  },
});