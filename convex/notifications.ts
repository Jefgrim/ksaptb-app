
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// IMPORTANT: Set the ADMIN_EMAIL environment variable in your Convex project settings.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export const sendAdminNotification = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!ADMIN_EMAIL) {
      console.error("ADMIN_EMAIL environment variable not set. Admin notifications disabled.");
      return;
    }

    const bookingsToNotify = await ctx.db
      .query("bookings")
      .filter(q => q.eq(q.field("isAdminNotified"), false))
      .collect();

    for (const booking of bookingsToNotify) {
      await ctx.scheduler.runAfter(0, (internal as any).email.send, {
        to: ADMIN_EMAIL,
        subject: `New Payment Submission for ${booking.tourTitle}`,
        html: `
          <p>A new payment has been submitted for the tour: <strong>${booking.tourTitle}</strong>.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Booking ID: ${booking._id}</li>
            <li>User: ${booking.userName} (${booking.userEmail})</li>
            <li>Tickets: ${booking.ticketCount}</li>
          </ul>
          <p>Please log in to the admin panel to review and verify the payment.</p>
        `
      });
      await ctx.db.patch(booking._id, { isAdminNotified: true });
    }
  }
});

export const sendUserNotification = internalMutation({
  args: {},
  handler: async (ctx) => {
    const bookingsToNotify = await ctx.db
      .query("bookings")
      .filter(q => q.eq(q.field("isUserNotified"), false))
      .collect();

    for (const booking of bookingsToNotify) {
      const user = await ctx.db.get(booking.userId);
      if (user) {
        const status = booking.status === "confirmed" ? "Approved" : "Rejected";
        await ctx.scheduler.runAfter(0, (internal as any).email.send, {
          to: user.email,
          subject: `Payment ${status} for ${booking.tourTitle}`,
          html: `
            <p>Hello ${user.name},</p>
            <p>Your payment for the tour <strong>${booking.tourTitle}</strong> has been <strong>${status}</strong>.</p>
            <p><strong>Booking Details:</strong></p>
            <ul>
              <li>Booking ID: ${booking._id}</li>
              <li>Status: ${booking.status}</li>
            </ul>
            <p>You can view your booking details in your account.</p>
            <p>This is an automated message DO NOT REPLY</p>
          `
        });
        await ctx.db.patch(booking._id, { isUserNotified: true });
      }
    }
  }
});
