"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useParams } from "next/navigation"; // <--- 1. Import this
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

export default function TourDetail() {
  // 2. Use the hook instead of props
  const params = useParams();

  // 3. Safely cast the ID (it might be undefined initially)
  const tourId = params.id as Id<"tours">;

  // 4. CONDITIONAL FETCH: If tourId is missing, pass "skip" to prevent the crash
  const tour = useQuery(api.tours.get, tourId ? { id: tourId } : "skip");

  if (!tour) return <div className="p-10 text-center">Loading...</div>;

  const allImages = [
    ...(tour.imageUrl ? [tour.imageUrl] : []),
    ...(tour.galleryUrls || []),
  ];

  const bookTour = useMutation(api.tours.book);

  const handleBook = async () => {
    if (!tourId) return; // Safety check
    try {
      await bookTour({ tourId });
      toast.success("Tour booked successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // 5. Handle loading (tour is undefined) or invalid ID
  if (!tour) {
    return <div className="p-10 text-center">Loading details...</div>;
  }

  return (
    <div className="container mx-auto p-10">
      <div className="max-w-2xl mx-auto border p-6 rounded-lg shadow-sm bg-white">

        {/* CAROUSEL BLOCK */}
        {allImages.length > 0 ? (
          <Carousel className="w-full mb-6">
            <CarouselContent>
              {allImages.map((url, index) => (
                <CarouselItem key={index} className="h-64 md:h-96 relative">
                  {/* Using standard img tag for simplicity, can use Next/Image later */}
                  <img
                    src={url}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {allImages.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        ) : (
          // Fallback if no images at all
          <div className="h-64 mb-6 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No images available
          </div>
        )}

        <h1 className="text-3xl font-bold mb-4">{tour.title}</h1>
        <p className="text-gray-700 mb-6">{tour.description}</p>

        <div className="bg-slate-50 p-4 rounded-md mb-6">
          <p><strong>Price:</strong> ${(tour.price / 100).toFixed(2)}</p>
          <p><strong>Date:</strong> {new Date(tour.startDate).toLocaleDateString()}</p>
          <p><strong>Availability:</strong> {tour.capacity - tour.bookedCount} / {tour.capacity}</p>
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={handleBook}
          disabled={tour.bookedCount >= tour.capacity}
        >
          {tour.bookedCount >= tour.capacity ? "Sold Out" : "Book Now"}
        </Button>
      </div>
    </div>
  );
}