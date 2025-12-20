"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingList } from "@/components/bookings/BookingList";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react"; // Added Clock Icon

export default function MyBookings() {
  const data = useQuery(api.bookings.getMyBookings);

  if (!data) {
    return (
      <div className="container mx-auto p-4 md:p-10">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="pl-0 text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </Link>
        </div>
        <div className="text-center py-20 text-gray-400 animate-pulse">
          Loading your bookings...
        </div>
      </div>
    );
  }

  // Sort by date
  const sortedData = [...data].sort((a, b) =>
    (b.tour?.startDate || 0) - (a.tour?.startDate || 0)
  );

  const now = Date.now();

  // --- FIX HERE: Include "pending" status ---
  // ... inside your component

  const upcoming = sortedData.filter(
    (b) =>
      // "reviewing" is covered by "pending" here
      (b.status === "confirmed" || b.status === "pending" || b.status === "holding") &&
      (b.tour?.startDate || 0) >= now
  );

  const past = sortedData.filter(
    (b) => b.status === "confirmed" && (b.tour?.startDate || 0) < now
  );

  const cancelled = sortedData.filter(
    (b) =>
      // "rejected" is covered by "cancelled" here
      b.status === "cancelled" || b.status === "expired"
  );

  // Helper to count pending bookings for a badge (optional)
  const pendingCount = upcoming.filter(b => b.status === "pending").length;

  return (
    <div className="container mx-auto p-4 md:p-10">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Trips</h1>

        <Link href="/">
          <Button variant="outline" className="w-full md:w-auto gap-2 border-slate-300">
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Button>
        </Link>
      </div>

      {/* --- PENDING STATUS NOTICE (Optional but helpful) --- */}
      {pendingCount > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-3 text-blue-800">
          <Clock className="w-5 h-5 text-blue-600" />
          <p className="text-sm">
            You have <strong>{pendingCount} pending booking(s)</strong> awaiting payment verification.
          </p>
        </div>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past Trips ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <BookingList
            list={upcoming}
            allowCancel={true}
            emptyMessage="You have no upcoming trips booked."
          />
        </TabsContent>

        <TabsContent value="past">
          <BookingList
            list={past}
            allowCancel={false}
            emptyMessage="You haven't completed any trips yet."
          />
        </TabsContent>

        <TabsContent value="cancelled">
          <BookingList
            list={cancelled}
            allowCancel={false}
            emptyMessage="No cancelled bookings found."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}