"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Users } from "lucide-react";

interface BookingProps {
  booking: {
    _id: Id<"bookings">;
    status: string;
    ticketCount: number; // Added ticketCount
    
    // Snapshot fields
    tourTitle: string;
    tourDate: number;
    tourPrice: number;

    // The "Live" relation
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
  
  // Destructure everything including ticketCount
  const { tour, status, _id, tourTitle, tourDate, tourPrice, ticketCount } = booking;

  // --- INTEGRITY FIX ---
  // We prioritize the SNAPSHOT data (saved at booking time).
  // We only fallback to 'tour.*' (live data) if the snapshot is missing.
  
  const displayTitle = tourTitle || tour?.title || "Unknown Tour";
  const displayDate = tourDate || tour?.startDate || Date.now();
  
  // Price Logic: Use snapshot price, fallback to live, default to 0
  const unitPrice = tourPrice !== undefined ? tourPrice : (tour?.price || 0);
  const count = ticketCount || 1;
  const totalPrice = unitPrice * count;

  // Image Logic: We still use the live image (images are rarely snapshotted due to size)
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
    <Card className="overflow-hidden hover:shadow-md transition-shadow bg-white border-slate-200">
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
              <span className="text-xs font-medium">Image Not Available</span>
            </div>
          )}
        </div>

        {/* DETAILS SECTION */}
        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          
          {/* Header: Title & Badge */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-2">
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight line-clamp-1">
                {displayTitle}
              </h3>
              <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                📅 {new Date(displayDate).toLocaleDateString("en-US", { 
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: "Asia/Riyadh" 
                })}
              </p>
            </div>

            <Badge
              className={
                status === "cancelled" ? "bg-red-100 text-red-700 hover:bg-red-100 border-none" : 
                (status === "confirmed" && !allowCancel) ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" :
                "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
              }
              variant="secondary"
            >
              {status === "cancelled" ? "Cancelled" : (status === "confirmed" && !allowCancel ? "Completed" : "Confirmed")}
            </Badge>
          </div>

          {/* Footer: Price & Actions */}
          <div className="flex justify-between items-end border-t border-slate-100 pt-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-0.5">
                <Users className="w-4 h-4" />
                <span>{count} ticket{count > 1 ? 's' : ''}</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                ${(totalPrice / 100).toFixed(2)}
              </p>
            </div>

            {allowCancel && status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-9 text-xs"
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