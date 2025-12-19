"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

// Define the shape of data we expect
interface BookingProps {
  booking: {
    _id: Id<"bookings">;
    status: string;
    tour: {
      title: string;
      startDate: number;
      price: number;
      imageUrl: string | null;
    } | null;
  };
  allowCancel: boolean;
}

export function BookingCard({ booking, allowCancel }: BookingProps) {
  const cancel = useMutation(api.bookings.cancelBooking);
  const { tour, status, _id } = booking;

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancel({ bookingId: _id });
      toast.success("Booking cancelled successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel booking");
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0 flex flex-col md:flex-row">
        {/* Thumbnail Image */}
        <div className="w-full md:w-48 h-32 relative bg-gray-200 shrink-0">
          {tour?.imageUrl ? (
            <img
              src={tour.imageUrl}
              alt={tour.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
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

            <Badge
              variant={
                status === "cancelled" ? "destructive" : allowCancel ? "default" : "secondary"
              }
            >
              {status === "confirmed" && !allowCancel ? "Completed" : status}
            </Badge>
          </div>

          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-sm font-semibold">
                ${tour ? (tour.price / 100).toFixed(2) : "0.00"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Ref: {_id.slice(-6)}</p>
            </div>

            {allowCancel && status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleCancel}
              >
                Cancel Booking
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}