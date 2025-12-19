"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="container mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-4">
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