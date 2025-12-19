"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingList } from "@/components/bookings/BookingList";

export default function MyBookings() {
  const data = useQuery(api.bookings.getMyBookings);

  if (!data) return <div className="p-10 text-center">Loading bookings...</div>;

  // 1. Sort & Filter Data
  const sortedData = [...data].sort((a, b) => 
    (b.tour?.startDate || 0) - (a.tour?.startDate || 0)
  );

  const now = Date.now();
  
  const upcoming = sortedData.filter(
    (b) => b.status === "confirmed" && (b.tour?.startDate || 0) >= now
  );

  const past = sortedData.filter(
    (b) => b.status === "confirmed" && (b.tour?.startDate || 0) < now
  );

  const cancelled = sortedData.filter(
    (b) => b.status === "cancelled"
  );

  return (
    <div className="container mx-auto p-4 md:p-10">
      <h1 className="text-3xl font-bold mb-6">My Trips</h1>

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