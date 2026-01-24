import { query } from "./_generated/server";
import { v } from "convex/values";

// KSA is UTC+3
const KSA_TIME_OFFSET = 3 * 60 * 60 * 1000;

function getKsaToday() {
  const now = new Date();
  const ksaTime = new Date(now.getTime() + KSA_TIME_OFFSET);
  return ksaTime;
}

export const getAnalytics = query({
  args: {
    month: v.optional(v.number()), // Month is 1-indexed
    year: v.optional(v.number()),
  },
  handler: async ({ db }, { month, year }) => {
    // 1. Fetch ALL tours and bookings
    const allTours = await db.query("tours").collect();
    const allBookings = await db.query("bookings").collect();

    // 2. Determine which tours to analyze based on filter
    let toursToAnalyze = allTours;
    if (month && year) {
      toursToAnalyze = allTours.filter(tour => {
        const tourDateKSA = new Date(tour.startDate);
        const ksaYear = tourDateKSA.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).slice(0, 4);
        const ksaMonth = tourDateKSA.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).slice(5, 7);
        return parseInt(ksaYear) === year && parseInt(ksaMonth) === month;
      });
    }
    
    const completedTours = toursToAnalyze.filter(tour => tour.isCompleted);
    const completedTourIds = new Set(completedTours.map(t => t._id));

    // 3. Filter bookings that belong to the *completed* tours we're analyzing
    const relevantBookings = allBookings.filter(b => completedTourIds.has(b.tourId));
    
    // From relevant bookings, get only the confirmed ones
    const confirmedAndCompletedBookings = relevantBookings.filter(b => b.status === 'confirmed');

    // 4. Calculate revenue from the confirmed bookings of completed tours
    let totalRevenue = 0;
    for (const booking of confirmedAndCompletedBookings) {
        totalRevenue += (booking.tourPrice ?? 0) * booking.ticketCount;
    }

    return {
      totalTours: completedTours.length,
      totalBookings: confirmedAndCompletedBookings.length,
      totalRevenue: totalRevenue,
    };
  },
});


// --- DETAILED REPORT QUERY ---
export const getDetailedBookingsReport = query({
    args: {
        month: v.optional(v.number()), // 1-indexed
        year: v.optional(v.number()),
        tourId: v.optional(v.string()),
    },
    handler: async (ctx, { month, year, tourId }) => {
        const now = getKsaToday();
        
        const allBookings = await ctx.db.query("bookings")
            .filter(q => q.eq(q.field("status"), "confirmed"))
            .order("desc")
            .collect();

        const allTours = await ctx.db.query("tours").collect();
        const toursMap = new Map(allTours.map(tour => [tour._id, tour]));

        let report = [];
        let totalRevenue = 0;
        let totalTickets = 0;

        for (const booking of allBookings) {
            const tour = toursMap.get(booking.tourId);

            if (!tour) continue;

            // --- FILTERING LOGIC ---

            // Base condition: tour must be completed.
            if (new Date(tour.startDate) >= now) {
                continue;
            }

            // Filter by Tour ID
            if (tourId && tour._id !== tourId) {
                continue;
            }

            // Filter by Year and Month
            if (year) {
                const tourDateKSA = new Date(tour.startDate);
                const ksaYear = parseInt(tourDateKSA.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).slice(0, 4));
                
                if (ksaYear !== year) {
                    continue;
                }

                // If year matches, check month (if provided)
                if (month) {
                    const ksaMonth = parseInt(tourDateKSA.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }).slice(5, 7));
                    if (ksaMonth !== month) {
                        continue;
                    }
                }
            }

            // --- END FILTERING LOGIC ---
            
            // If we've reached here, the booking passes all filters.
            const user = await ctx.db.get(booking.userId);
            const amount = (booking.tourPrice ?? 0) * booking.ticketCount;

            totalRevenue += amount;
            totalTickets += booking.ticketCount;

            report.push({
                bookingId: booking._id,
                tourName: tour.title ?? 'Unknown Tour',
                tourDate: new Date(tour.startDate).toLocaleDateString(),
                customerName: user?.name ?? 'Unknown User',
                bookingStatus: booking.status,
                paymentStatus: booking.paymentStatus,
                paymentMethod: booking.paymentMethod,
                ticketCount: booking.ticketCount,
                amount: amount / 100,
                netAmount: amount / 100, // Simplified
                fees: 0, // Simplified
                createdAt: new Date(booking._creationTime).toLocaleString(),
            });
        }

        return {
            report,
            totalRevenue: totalRevenue / 100,
            totalTickets,
        };
    },
});
