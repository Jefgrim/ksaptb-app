"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function MyBookings() {
  const data = useQuery(api.bookings.getMyBookings);
  const cancel = useMutation(api.bookings.cancelBooking);

  if (!data) return <div className="p-10 text-center">Loading bookings...</div>;

  // 1. Sort Data: Newest trips first
  const sortedData = [...data].sort((a, b) => 
    (b.tour?.startDate || 0) - (a.tour?.startDate || 0)
  );

  // 2. Filter Data into Categories
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

  // 3. Helper to Cancel
  const handleCancel = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancel({ bookingId });
      toast.success("Booking cancelled successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel booking");
    }
  };

  // 4. Reusable List Component
  const BookingList = ({ 
    list, 
    allowCancel 
  }: { 
    list: typeof data, 
    allowCancel: boolean 
  }) => (
    <div className="space-y-4">
      {list.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg text-gray-500 border border-dashed">
          No bookings found in this category.
        </div>
      ) : (
        list.map(({ tour, ...booking }) => (
          <Card key={booking._id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0 flex flex-col md:flex-row">
              {/* Thumbnail Image */}
              <div className="w-full md:w-48 h-32 relative bg-gray-200 shrink-0">
                {tour?.coverImageId ? (
                  <img 
                    src={tour.coverImageId} 
                    alt={tour.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              {/* Booking Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-lg">{tour?.title || "Unknown Tour"}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      📅 {tour ? new Date(tour.startDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  
                  <Badge variant={
                    booking.status === "cancelled" ? "destructive" : 
                    allowCancel ? "default" : "secondary"
                  }>
                    {booking.status === "confirmed" && !allowCancel ? "Completed" : booking.status}
                  </Badge>
                </div>

                <div className="mt-4 flex justify-between items-end">
                  <div>
                     <p className="text-sm font-semibold">${tour ? (tour.price / 100).toFixed(2) : "0.00"}</p>
                     <p className="text-xs text-gray-400 mt-1">Ref: {booking._id.slice(-6)}</p>
                  </div>

                  {allowCancel && booking.status === "confirmed" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleCancel(booking._id)}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
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
          <BookingList list={upcoming} allowCancel={true} />
        </TabsContent>

        <TabsContent value="past">
          <BookingList list={past} allowCancel={false} />
        </TabsContent>

        <TabsContent value="cancelled">
          <BookingList list={cancelled} allowCancel={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}