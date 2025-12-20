"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Import our new components
import { BookingList } from "@/components/admin/BookingList";
import { TourList } from "@/components/admin/TourList";
import { CreateTourForm } from "@/components/admin/CreateTourForm";

export default function AdminDashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const user = useQuery(api.users.current);

  // Security Redirect
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn || (user !== undefined && user?.role !== "admin")) {
        router.replace("/");
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || user === undefined) return <div className="p-10 text-center">Verifying admin privileges...</div>;
  if (user?.role !== "admin") return null;

  return (
    <div className="container mx-auto p-4 md:p-10">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        
        {/* Return Button */}
        <Link href="/">
          <Button variant="outline" className="w-full md:w-auto gap-2 border-slate-300">
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="bookings">All Bookings</TabsTrigger>
          <TabsTrigger value="tours">Manage Tours</TabsTrigger>
          <TabsTrigger value="create">Create Tour</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <BookingList />
        </TabsContent>

        <TabsContent value="tours">
          <TourList />
        </TabsContent>

        <TabsContent value="create">
          <CreateTourForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}