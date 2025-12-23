"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarOff } from "lucide-react"; // Make sure to install lucide-react if not present

// Import our new components
import { TourGallery } from "@/components/tours/TourGallery";
import { BookingAction } from "@/components/tours/BookingAction";

export default function TourDetail() {
  const params = useParams();
  const router = useRouter();
  
  // 1. Data Fetching
  const tourId = params.id as Id<"tours">;
  const tour = useQuery(api.tours.get, tourId ? { id: tourId } : "skip");

  // 2. Loading State
  if (tour === undefined) {
    return <div className="p-20 text-center text-gray-500">Loading tour details...</div>;
  }

  // 3. Not Found State
  if (tour === null) {
    return (
      <div className="container mx-auto p-10 text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Tour Not Found</h1>
        <p className="text-gray-600 mb-6">The tour you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.push("/")} variant="outline">Return Home</Button>
      </div>
    );
  }

  // --- NEW: Calculate Status ---
  const isCancelled = tour.cancelled;
  const isPast = tour.startDate < Date.now();
  const isUnavailable = isCancelled || isPast;

  // 4. Main Layout
  return (
    <div className="container mx-auto p-4 md:p-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        
        {/* LEFT COLUMN: Images & Description */}
        <div className="md:col-span-2 space-y-6">
          <div className="relative">
             <TourGallery 
                coverImage={tour.imageUrl} 
                galleryImages={tour.galleryUrls} 
             />
             {/* Optional: Add visual badge over image */}
             {isCancelled && (
               <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1 font-bold rounded shadow-lg z-10">
                 CANCELLED
               </div>
             )}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
              {tour.title}
              {isCancelled && <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">Cancelled</span>}
              {isPast && !isCancelled && <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Ended</span>}
            </h1>
            <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {tour.description}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Booking Card OR Unavailable Message */}
        <div className="md:col-span-1">
          <div className="sticky top-6">
            
            {isUnavailable ? (
              // --- DISABLED VIEW ---
              <div className="border rounded-xl p-6 bg-slate-50 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-slate-700">
                  {isCancelled ? <AlertCircle className="w-6 h-6 text-red-500" /> : <CalendarOff className="w-6 h-6 text-slate-500" />}
                  <h3 className="font-semibold text-lg">
                    {isCancelled ? "Tour Cancelled" : "Tour Unavailable"}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {isCancelled 
                    ? "This tour has been cancelled by the organizers. Bookings are no longer accepted." 
                    : "This tour has already taken place or is no longer available for booking."}
                </p>
                <Button className="w-full" variant="outline" onClick={() => router.push("/")}>
                  View Other Tours
                </Button>
              </div>
            ) : (
              // --- ACTIVE VIEW (Your existing component) ---
              <BookingAction 
                tourId={tour._id}
                price={tour.price}
                capacity={tour.capacity}
                bookedCount={tour.bookedCount}
                startDate={tour.startDate}
              />
            )}

          </div>
        </div>

      </div>
    </div>
  );
}