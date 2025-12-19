"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useParams } from "next/navigation"; // <--- 1. Import this

export default function TourDetail() {
  // 2. Use the hook instead of props
  const params = useParams();

  // 3. Safely cast the ID (it might be undefined initially)
  const tourId = params.id as Id<"tours">;

  // 4. CONDITIONAL FETCH: If tourId is missing, pass "skip" to prevent the crash
  const tour = useQuery(api.tours.get, tourId ? { id: tourId } : "skip");

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

        {/* IMAGE HERO */}
        {tour.imageUrl && (
          <div className="mb-6 rounded-lg overflow-hidden h-64 w-full">
            <img
              src={tour.imageUrl}
              alt={tour.title}
              className="w-full h-full object-cover"
            />
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