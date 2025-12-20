"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Lock } from "lucide-react";

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

  const [ticketCount, setTicketCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingSpots = capacity - bookedCount;
  const isSoldOut = remainingSpots <= 0;
  const totalPrice = price * ticketCount;

  const increment = () => {
    if (ticketCount < remainingSpots) setTicketCount(c => c + 1);
  };

  const decrement = () => {
    if (ticketCount > 1) setTicketCount(c => c - 1);
  };

  const handleBook = async () => {
    setIsSubmitting(true);
    try {
      await bookTour({ 
        tourId, 
        ticketCount 
      });
      toast.success(`Success! Booked ${ticketCount} ticket(s).`);
      router.push("/my-bookings");
    } catch (error: any) {
      if (error instanceof ConvexError) {
        toast.error(error.data);
      } else {
        console.error(error);
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-50 border-none shadow-sm sticky top-6">
      <CardContent className="p-6 space-y-5">
        
        {/* Info Block */}
        <div className="space-y-3 text-sm">
          
          {/* 1. PRICE ROW (Hidden if not logged in) */}
          {isSignedIn ? (
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-gray-600">Price per person</span>
              <span className="font-semibold text-lg">${(price / 100).toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-gray-600">Price</span>
              <span className="font-medium text-slate-400 italic flex items-center gap-1">
                <Lock className="w-3 h-3" /> Login to view
              </span>
            </div>
          )}
          
          {/* 2. DATE ROW (Always Visible) */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Date</span>
            <span className="font-medium">{new Date(startDate).toLocaleDateString()}</span>
          </div>
          
          {/* 3. AVAILABILITY ROW (Hidden if not logged in) */}
          {isSignedIn && (
            <div className="flex justify-between items-center">
               <span className="text-gray-600">Availability</span>
               <span className={`font-medium ${remainingSpots < 5 ? "text-orange-600" : "text-green-600"}`}>
                 {isSoldOut ? "Sold Out" : `${remainingSpots} spots left`}
              </span>
            </div>
          )}
        </div>

        {/* --- LOGGED IN CONTENT --- */}
        {isSignedIn && (
          <>
            {/* Quantity Selector */}
            {!isSoldOut && (
              <div className="bg-white p-3 rounded-lg border flex items-center justify-between shadow-sm">
                <span className="text-sm font-medium text-gray-700">Guests</span>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={decrement}
                    disabled={ticketCount <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-bold text-lg">{ticketCount}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={increment}
                    disabled={ticketCount >= remainingSpots}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Total Price Display */}
            {!isSoldOut && (
              <div className="flex justify-between items-end pt-2 border-t border-slate-200 mt-2">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <div className="text-right">
                  <span className="block font-bold text-3xl text-blue-600">
                    ${(totalPrice / 100).toFixed(2)}
                  </span>
                  {ticketCount > 1 && (
                    <span className="text-xs text-gray-500">
                      {ticketCount} tickets @ ${(price / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* --- ACTION BUTTON --- */}
        {!isLoaded ? (
          <Button disabled className="w-full h-12">Loading...</Button>
        ) : !isSignedIn ? (
          <SignInButton mode="modal">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
              Log in to View Price & Book
            </Button>
          </SignInButton>
        ) : (
          <Button
            size="lg"
            className="w-full h-12 text-lg font-semibold"
            onClick={handleBook}
            disabled={isSoldOut || isSubmitting}
          >
            {isSubmitting ? "Processing..." : isSoldOut ? "Sold Out" : "Book Now"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}