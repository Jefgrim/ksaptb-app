import { BookingCard } from "./BookingCard";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FileQuestion } from "lucide-react";
import { ReactNode } from "react";

interface BookingListProps {
  list: any[];
  allowCancel: boolean;
  emptyMessage: string;
  emptyIcon?: ReactNode; // Added this to fix your error
  isPast?: boolean;
}

export function BookingList({ 
  list, 
  allowCancel, 
  emptyMessage, 
  emptyIcon, 
  isPast 
}: BookingListProps) {
  
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  const handleCancel = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) return;

    try {
      await cancelBooking({ bookingId });
      toast.success("Booking cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            {/* Use the passed icon, or default to FileQuestion */}
            {emptyIcon ? (
              <div className="text-slate-400">{emptyIcon}</div>
            ) : (
              <FileQuestion className="w-8 h-8 text-slate-400" />
            )}
        </div>
        <p className="text-lg font-medium text-slate-600">{emptyMessage}</p>
        <p className="text-sm text-slate-400 mt-1">
            Browse our tours to find your next adventure.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {list.map((booking) => (
        <BookingCard 
          key={booking._id} 
          booking={booking} 
          onCancel={allowCancel ? handleCancel : undefined}
          isPast={isPast}
        />
      ))}
    </div>
  );
}