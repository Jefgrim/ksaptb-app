"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { CalendarIcon, MapPin, Ticket } from "lucide-react";

export default function Home() {
  // Use listUpcoming to hide past tours from the homepage
  const tours = useQuery(api.tours.listUpcoming);
  
  const { isSignedIn, isLoaded } = useUser();

  // --- LOADING STATE ---
  if (tours === undefined || !isLoaded) {
    return (
      <main className="container mx-auto p-4 pt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[400px] bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden md:block">
              KSA Pinoy Travel Buddies
            </h1>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 md:hidden">
              KPTB
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {isSignedIn && (
              <Link href="/my-bookings">
                <Button variant="ghost" className="text-sm font-medium">
                  <Ticket className="w-4 h-4 mr-2" />
                  My Bookings
                </Button>
              </Link>
            )}

            <div className="pl-2 border-l">
              {isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <SignInButton mode="modal">
                  <Button size="sm">Sign In</Button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- HERO / HEADER --- */}
      <div className="container mx-auto px-4 py-10 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
          Explore the Kingdom
        </h2>
        <p className="text-slate-600 max-w-lg mx-auto">
          Join our community of travelers. Discover new places, meet new friends, and make unforgettable memories.
        </p>
      </div>

      {/* --- TOUR GRID --- */}
      <main className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tours?.map((tour) => {
            const isSoldOut = tour.bookedCount >= tour.capacity;
            const remaining = tour.capacity - tour.bookedCount;
            const isLowStock = remaining > 0 && remaining <= 5;

            return (
              <Card 
                key={tour._id} 
                className="group flex flex-col overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
              >
                {/* IMAGE AREA */}
                <div className="relative h-56 w-full bg-gray-200 overflow-hidden">
                  {tour.imageUrl ? (
                    <img
                      src={tour.imageUrl}
                      alt={tour.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <MapPin className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isSoldOut ? (
                      <Badge variant="destructive">Sold Out</Badge>
                    ) : isLowStock ? (
                      <Badge className="bg-orange-500 hover:bg-orange-600">Only {remaining} left!</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-white/90 text-slate-800 backdrop-blur-sm">
                        Available
                      </Badge>
                    )}
                  </div>
                </div>

                {/* CONTENT AREA */}
                <CardContent className="flex-1 p-5">
                  <div className="flex items-center text-sm text-blue-600 font-medium mb-2">
                    <CalendarIcon className="w-4 h-4 mr-1.5" />
                    {new Date(tour.startDate).toLocaleDateString("en-US", {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: "Asia/Riyadh"
                    })}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">
                    {tour.title}
                  </h3>

                  <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-4">
                    {tour.description}
                  </p>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      ${(tour.price / 100).toFixed(0)}
                    </span>
                    <span className="text-slate-400 text-sm">/ person</span>
                  </div>
                </CardContent>

                {/* FOOTER AREA */}
                <CardFooter className="p-5 pt-0 mt-auto">
                  <Link href={`/tours/${tour._id}`} className="w-full">
                    <Button 
                      className="w-full font-semibold shadow-sm" 
                      variant={isSoldOut ? "secondary" : "default"}
                    >
                      {isSoldOut ? "View Details" : "Book Now"}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        {tours?.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            No upcoming tours available. Check back soon!
          </div>
        )}
      </main>
    </div>
  );
}