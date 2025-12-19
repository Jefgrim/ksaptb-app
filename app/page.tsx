"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const tours = useQuery(api.tours.list);
  const { isSignedIn } = useUser();

  return (
    <main className="container mx-auto p-4">
      <nav className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">TourBooking</h1>
        <div>
          {isSignedIn ? <UserButton /> : <SignInButton mode="modal"><Button>Sign In</Button></SignInButton>}
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tours?.map((tour) => (
          <Card key={tour._id} className="overflow-hidden">

            {/* IMAGE DISPLAY */}
            {tour.imageUrl && (
              <div className="w-full h-48 relative">
                <img
                  src={tour.imageUrl}
                  alt={tour.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader>
              <CardTitle>{tour.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{tour.description}</p>
              <div className="flex justify-between text-sm font-semibold">
                <span>${tour.price / 100}</span>
                <span>{tour.capacity - tour.bookedCount} spots left</span>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/tours/${tour._id}`} className="w-full">
                <Button className="w-full">View Details</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}