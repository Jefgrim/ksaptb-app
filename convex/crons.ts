import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup-expired-bookings",
  { minutes: 1 },
  internal.bookings.cleanupExpired
);

export default crons;