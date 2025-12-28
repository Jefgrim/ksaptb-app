
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// IMPORTANT: Add your Resend API Key to your Convex project's environment variables.
// 1. Go to your project settings in the Convex dashboard.
// 2. Find the "Environment Variables" section.
// 3. Add a new variable named `RESEND_API_KEY` with the value of your API key.
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// IMPORTANT: You must also verify your sending domain with Resend.
// You can set the RESEND_FROM_EMAIL environment variable.
// By default, it uses "onboarding@resend.dev" for testing.
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "KSA PTB <onboarding@resend.dev>";

export const send = internalAction({
  args: { 
    to: v.union(v.string(), v.array(v.string())), 
    subject: v.string(), 
    html: v.string() 
  },
  handler: async (_, { to, subject, html }) => {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY environment variable not set. Email not sent.");
      return;
    }
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Failed to send email:", errorBody);
    } else {
      console.log("Email sent successfully.");
    }
  },
});
