"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode } from "lucide-react";

// 1. Import your AuthGuard
import AdminGuard from "@/components/AdminGuard";

// Import your admin components
import { BookingList } from "@/components/admin/BookingList";
import { TourList } from "@/components/admin/TourList";
import { CreateTourForm } from "@/components/admin/CreateTourForm";

export default function AdminDashboard() {
  // You no longer need useUser, useQuery, or useEffect here!
  // The AuthGuard handles all of that.

  return (
    // 2. Wrap everything in the Guard
    <AdminGuard>
      <div className="container mx-auto p-4 md:p-10">

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Link href="/admin/scanner">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <QrCode className="w-4 h-4" />
                Scan Tickets
              </Button>
            </Link>

            {/* Return Button */}
            <Link href="/">
              <Button variant="outline" className="w-full md:w-auto gap-2 border-slate-300">
                <ArrowLeft className="w-4 h-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* --- TABS SECTION --- */}
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
    </AdminGuard>
  );
}