import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-expired-bookings",
  { minutes: 1 },
  internal.bookings.cleanupExpired
);

crons.interval(
  "mark-tours-completed",
  { hours: 1 }, // Runs hourly to check if start date has passed
  internal.tours.checkAndMarkCompleted
);

export default crons;