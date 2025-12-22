import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 1. Define protected routes
const isProtectedRoute = createRouteMatcher([
  // '/admin(.*)', '/my-bookings(.*)'
  ]);

// 2. Define Admin routes specifically (Optional: requires storing role in Clerk session metadata for pure middleware checking, 
// but for now we just ensure they are logged in, and the Page component handles the Role check as we did previously)

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};