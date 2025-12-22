"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingList } from "@/components/bookings/BookingList"; // Adjust path if needed
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

// 1. Import your new UserGuard
import UserGuard from "@/components/UserGuard";

// --- MAIN EXPORT ---
export default function MyBookingsPage() {
  return (
    <UserGuard>
      <MyBookingsContent />
    </UserGuard>
  );
}

// --- INNER COMPONENT (Only renders if logged in) ---
function MyBookingsContent() {
  // We can safely fetch now without "skip" logic because UserGuard guarantees we are logged in
  const data = useQuery(api.bookings.getMyBookings);

  // Loading state for the data fetching
  if (data === undefined) {
    return (
      <div className="container mx-auto p-4 md:p-10 flex flex-col items-center justify-center py-20 space-y-4">
         <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
         <p className="text-slate-400 animate-pulse">Loading your adventures...</p>
      </div>
    );
  }

  // --- SORTING & FILTERING ---
  const sortedData = [...data].sort((a, b) =>
    (b.tour?.startDate || 0) - (a.tour?.startDate || 0)
  );

  const now = Date.now();

  const upcoming = sortedData.filter((b) => {
    const isFuture = (b.tour?.startDate || 0) >= now;
    const isActive = b.status === "confirmed" || b.status === "pending" || b.status === "holding";
    return isFuture && isActive;
  });

  const past = sortedData.filter((b) => {
    const isPastDate = (b.tour?.startDate || 0) < now;
    return b.status === "confirmed" && isPastDate;
  });

  const cancelled = sortedData.filter((b) => 
    b.status === "cancelled" || b.status === "expired" || b.status === "rejected" || b.status === "refunded"
  );

  const pendingCount = upcoming.filter(b => b.status === "pending").length;

  return (
    <div className="container mx-auto p-4 md:p-10 min-h-screen bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Trips</h1>
          <p className="text-slate-500 mt-1">Manage your upcoming adventures and view past history.</p>
        </div>

        <Link href="/">
          <Button variant="outline" className="w-full md:w-auto gap-2 bg-white hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start sm:items-center gap-3 text-amber-900 shadow-sm">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-sm">
            <span className="font-semibold">Action Required:</span> You have <strong>{pendingCount} pending booking(s)</strong> being verified.
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full space-y-8">
        <TabsList className="grid w-full grid-cols-3 bg-slate-200/50 p-1 rounded-xl">
          <TabsTrigger value="upcoming">
            Upcoming <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded-full text-xs font-semibold hidden sm:inline-block">{upcoming.length}</span>
          </TabsTrigger>
          <TabsTrigger value="past">
            Past <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded-full text-xs font-semibold hidden sm:inline-block">{past.length}</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded-full text-xs font-semibold hidden sm:inline-block">{cancelled.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="outline-none">
          <BookingList
            list={upcoming}
            allowCancel={true}
            emptyMessage="You have no upcoming trips booked."
            emptyIcon={<Clock className="w-10 h-10 text-slate-300" />}
          />
        </TabsContent>

        <TabsContent value="past" className="outline-none">
          <BookingList
            list={past}
            allowCancel={false}
            isPast={true}
            emptyMessage="You haven't completed any trips yet."
            emptyIcon={<CheckCircle2 className="w-10 h-10 text-slate-300" />} 
          />
        </TabsContent>

        <TabsContent value="cancelled" className="outline-none">
          <BookingList
            list={cancelled}
            allowCancel={false}
            emptyMessage="No cancelled or refunded bookings found."
            emptyIcon={<AlertCircle className="w-10 h-10 text-slate-300" />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}