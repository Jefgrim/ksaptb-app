"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner"; // Assuming you use sonner for alerts

export default function AdminDashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const user = useQuery(api.users.current);

  // 1. DATA FETCHING (With Security "Skip")
  // Only fetch bookings if we are sure the user is an admin. 
  // This prevents the "Access Denied" crash.
  const shouldFetch = isLoaded && user?.role === "admin";
  
  const bookings = useQuery(
    api.bookings.getAllBookings, 
    shouldFetch ? undefined : "skip" 
  );

  // 2. MUTATIONS
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  const createTour = useMutation(api.tours.create);
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  // 3. STATE & REFS (Must be declared BEFORE any return statements)
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({ 
    title: "", 
    description: "", 
    price: 0, 
    capacity: 10, 
    date: "" 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4. SECURITY CHECK (Redirect Effect)
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.replace("/");
      } else if (user !== undefined && user?.role !== "admin") {
        router.replace("/");
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  // 5. LOADING VIEWS (Now safe to return)
  if (!isLoaded || user === undefined) {
    return <div className="p-10 text-center">Verifying admin privileges...</div>;
  }

  // Double check to hide UI while redirecting
  if (user?.role !== "admin") {
    return null; 
  }

  // --- HANDLERS ---

  const handleCancel = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure you want to cancel this booking? This will restore the tour capacity.")) {
      return;
    }

    try {
      await cancelBooking({ bookingId });
      toast.success("Booking cancelled");
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel booking");
    }
  };

  const uploadFile = async (file: File) => {
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!result.ok) throw new Error("Upload failed");
    const { storageId } = await result.json();
    return storageId as Id<"_storage">;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let coverImageId: Id<"_storage"> | undefined = undefined;
      const coverFile = imageInput.current?.files?.[0];
      if (coverFile) {
        coverImageId = await uploadFile(coverFile);
      }

      const galleryImageIds: Id<"_storage">[] = [];
      const galleryFiles = galleryInput.current?.files;
      if (galleryFiles && galleryFiles.length > 0) {
        const uploadPromises = Array.from(galleryFiles).map(uploadFile);
        const results = await Promise.all(uploadPromises);
        galleryImageIds.push(...results);
      }

      await createTour({
        title: form.title,
        description: form.description,
        price: Number(form.price) * 100,
        capacity: Number(form.capacity),
        startDate: form.date ? new Date(form.date).getTime() : Date.now(),
        coverImageId,
        galleryImageIds,
      });

      toast.success("Tour Created Successfully!");

      setForm({ title: "", description: "", price: 0, capacity: 10, date: "" });
      if (imageInput.current) imageInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";

    } catch (error) {
      console.error(error);
      toast.error("Failed to create tour");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="bookings">All Bookings</TabsTrigger>
          <TabsTrigger value="create">Create Tour</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardHeader><CardTitle>Master Booking List</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Handle empty state nicely */}
                  {(!bookings || bookings.length === 0) && (
                     <TableRow>
                       <TableCell colSpan={4} className="text-center h-24 text-gray-500">
                         No bookings found
                       </TableCell>
                     </TableRow>
                  )}
                  
                  {bookings?.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell>
                        <div className="font-medium">{b.userName}</div>
                        <div className="text-xs text-gray-500">{b.userEmail}</div>
                      </TableCell>
                      <TableCell>{b.tourTitle}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {b.status === "confirmed" ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(b._id)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Cancelled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card className="max-w-xl">
            <CardHeader><CardTitle>Add New Package</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-2">
                  <label>Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label>Start Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label>Cover Image</label>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={imageInput}
                  />
                </div>

                <div className="grid gap-2">
                  <label>Gallery Images (Select Multiple)</label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={galleryInput}
                  />
                </div>

                <div className="grid gap-2">
                  <label>Description</label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Price (USD)</label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: +e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Capacity</label>
                    <Input
                      type="number"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Uploading..." : "Publish Tour"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}