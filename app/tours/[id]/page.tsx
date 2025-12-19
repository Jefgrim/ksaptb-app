"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TourDetail({ params }: { params: { id: string } }) {
  const tourId = params.id as Id<"tours">;
  const tour = useQuery(api.tours.get, { id: tourId });
  const bookTour = useMutation(api.tours.book);

  const handleBook = async () => {
    try {
      await bookTour({ tourId });
      toast.success("Tour booked successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!tour) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-10">
      <div className="max-w-2xl mx-auto border p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-4">{tour.title}</h1>
        <p className="text-gray-700 mb-6">{tour.description}</p>

        <div className="bg-slate-50 p-4 rounded-md mb-6">
          <p><strong>Price:</strong> ${tour.price / 100}</p>
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