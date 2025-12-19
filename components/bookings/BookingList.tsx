"use client";

import { BookingCard } from "./BookingCard";

interface BookingListProps {
  list: any[]; // Using any[] for simplicity, but strictly typing is better if possible
  allowCancel: boolean;
  emptyMessage?: string;
}

export function BookingList({ 
  list, 
  allowCancel, 
  emptyMessage = "No bookings found in this category." 
}: BookingListProps) {
  
  if (list.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg text-gray-500 border border-dashed">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {list.map((booking) => (
        <BookingCard 
          key={booking._id} 
          booking={booking} 
          allowCancel={allowCancel} 
        />
      ))}
    </div>
  );
}