"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

  // 4. Main Layout
  return (
    <div className="container mx-auto p-4 md:p-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        
        {/* LEFT COLUMN: Images & Description (Takes up 2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          <TourGallery 
            coverImage={tour.imageUrl} 
            galleryImages={tour.galleryUrls} 
          />
          
          <div>
            <h1 className="text-3xl font-bold mb-4">{tour.title}</h1>
            <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {tour.description}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Booking Card (Takes up 1/3 width, sticky on desktop) */}
        <div className="md:col-span-1">
          <div className="sticky top-6">
            <BookingAction 
              tourId={tour._id}
              price={tour.price}
              capacity={tour.capacity}
              bookedCount={tour.bookedCount}
              startDate={tour.startDate}
            />
          </div>
        </div>

      </div>
    </div>
  );
}