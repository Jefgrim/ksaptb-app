"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";

interface BookingActionProps {
  tourId: Id<"tours">;
  price: number;
  capacity: number;
  bookedCount: number;
  startDate: number;
}

export function BookingAction({ 
  tourId, price, capacity, bookedCount, startDate 
}: BookingActionProps) {
  
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const bookTour = useMutation(api.tours.book);

  const isSoldOut = bookedCount >= capacity;
  const remaining = capacity - bookedCount;

  const handleBook = async () => {
    try {
      await bookTour({ tourId });
      toast.success("Tour booked successfully! Check 'My Bookings'.");
      router.push("/my-bookings");
    } catch (error: any) {
      if (error instanceof ConvexError) {
        toast.error(error.data);
      } else {
        console.error(error);
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <Card className="bg-slate-50 border-none shadow-sm">
      <CardContent className="p-6 space-y-4">
        {/* Info Block */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Price per person</span>
            <span className="font-bold text-lg">${(price / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date</span>
            <span className="font-medium">{new Date(startDate).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Availability</span>
            <span className={`font-medium ${remaining < 5 ? "text-orange-600" : ""}`}>
               {isSoldOut ? "Sold Out" : `${remaining} spots left`}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!isLoaded ? (
          <Button disabled className="w-full">Loading...</Button>
        ) : !isSignedIn ? (
          <SignInButton mode="modal">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Log in to Book
            </Button>
          </SignInButton>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={handleBook}
            disabled={isSoldOut}
          >
            {isSoldOut ? "Sold Out" : "Book Now"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}