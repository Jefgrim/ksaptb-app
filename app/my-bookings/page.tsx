"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingList } from "@/components/bookings/BookingList";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MyBookings() {
  const data = useQuery(api.bookings.getMyBookings);

  // 1. Loading State (With Back Button included so users aren't trapped)
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

  // 2. Sort & Filter Data
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
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Trips</h1>
        
        {/* Return Button */}
        <Link href="/">
          <Button variant="outline" className="w-full md:w-auto gap-2 border-slate-300">
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Button>
        </Link>
      </div>

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