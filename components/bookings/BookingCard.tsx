"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

// Update the interface to include the SNAPSHOT fields from your schema
interface BookingProps {
  booking: {
    _id: Id<"bookings">;
    status: string;
    
    // Snapshot fields (These exist in your schema!)
    tourTitle: string;
    tourDate: number;
    tourPrice: number;

    // The "Live" relation (might be null if deleted)
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
  
  // Destructure everything we need
  const { tour, status, _id, tourTitle, tourDate, tourPrice } = booking;

  // LOGIC: Try to get "Live" data first. If null, use the "Snapshot".
  const displayTitle = tour?.title || tourTitle || "Unknown Tour";
  const displayDate = tour?.startDate || tourDate || Date.now();
  const displayPrice = tour?.price || tourPrice || 0;
  
  // Image is special: if tour is deleted, the image file is likely gone too.
  const displayImage = tour?.imageUrl; 

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
    <Card className="overflow-hidden hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-0 flex flex-col md:flex-row">
        
        {/* IMAGE SECTION */}
        <div className="w-full md:w-48 h-32 relative bg-gray-100 shrink-0 border-r border-gray-100">
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm p-4 text-center">
              {/* Simple Icon for missing image */}
              <svg className="w-8 h-8 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Image Not Available</span>
            </div>
          )}
        </div>

        {/* DETAILS SECTION */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="flex flex-col md:flex-row justify-between items-start gap-2">
            <div>
              <h3 className="font-bold text-lg text-gray-900 leading-tight">
                {displayTitle}
              </h3>
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                📅 {new Date(displayDate).toLocaleDateString(undefined, { 
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                })}
              </p>
            </div>

            <Badge
              className={
                status === "cancelled" ? "bg-red-100 text-red-700 hover:bg-red-100" : 
                (status === "confirmed" && !allowCancel) ? "bg-green-100 text-green-700 hover:bg-green-100" :
                "bg-blue-100 text-blue-700 hover:bg-blue-100"
              }
              variant="secondary"
            >
              {status === "confirmed" && !allowCancel ? "Completed" : status.toUpperCase()}
            </Badge>
          </div>

          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-lg font-bold text-gray-900">
                ${(displayPrice / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">Ref: {_id.slice(-6)}</p>
            </div>

            {allowCancel && status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs"
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