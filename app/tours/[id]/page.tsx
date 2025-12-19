"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexError } from "convex/values"; // Import this for better error handling
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation"; // Correct Router import
import { useUser, SignInButton } from "@clerk/nextjs"; // Import Clerk hooks
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function TourDetail() {
  const params = useParams();
  const router = useRouter(); // Initialize router correctly
  const { isLoaded, isSignedIn } = useUser(); // Get auth state

  // 1. Data Hooks
  const tourId = params.id as Id<"tours">;
  const tour = useQuery(api.tours.get, tourId ? { id: tourId } : "skip");
  const bookTour = useMutation(api.tours.book);

  // 2. Loading State
  if (tour === undefined) {
    return <div className="p-10 text-center">Loading details...</div>;
  }

  // 3. Not Found State (Deleted or Invalid ID)
  if (tour === null) {
    return (
      <div className="container mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Tour Not Found</h1>
        <p className="text-gray-600 mb-6">The tour you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.push("/")}>Return Home</Button>
      </div>
    );
  }

  // 4. Handle Booking Logic
  const handleBook = async () => {
    if (!tourId) return;
    
    // Safety check (though the button should be hidden if not signed in)
    if (!isSignedIn) {
      toast.error("You must be logged in to book.");
      return;
    }

    try {
      await bookTour({ tourId });
      toast.success("Tour booked successfully! Check 'My Bookings'.");
      router.push("/my-bookings");
    } catch (error: any) {
      // Graceful Error Handling
      if (error instanceof ConvexError) {
        toast.error(error.data); // e.g. "Tour is sold out"
      } else {
        console.error(error);
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  // Combine images for the carousel
  const allImages = [
    ...(tour.imageUrl ? [tour.imageUrl] : []),
    ...(tour.galleryUrls || []),
  ];

  return (
    <div className="container mx-auto p-10">
      <div className="max-w-2xl mx-auto border p-6 rounded-lg shadow-sm bg-white">

        {/* CAROUSEL BLOCK */}
        {allImages.length > 0 ? (
          <Carousel className="w-full mb-6">
            <CarouselContent>
              {allImages.map((url, index) => (
                <CarouselItem key={index} className="h-64 md:h-96 relative">
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

        {/* 5. DYNAMIC ACTION BUTTON */}
        <div className="mt-4">
          {!isLoaded ? (
            <Button disabled className="w-full">Loading...</Button>
          ) : !isSignedIn ? (
            // If Guest: Show "Log in to Book"
            <SignInButton mode="modal">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Log in to Book this Tour
              </Button>
            </SignInButton>
          ) : (
            // If User: Show "Book Now"
            <Button
              size="lg"
              className="w-full"
              onClick={handleBook}
              disabled={tour.bookedCount >= tour.capacity}
            >
              {tour.bookedCount >= tour.capacity ? "Sold Out" : "Book Now"}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}