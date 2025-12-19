"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminDashboard() {
  const router = useRouter();

  // 1. Data Fetching
  const bookings = useQuery(api.bookings.getAllBookings);
  const user = useQuery(api.users.current);

  // Mutations
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  const createTour = useMutation(api.tours.create);
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  // 2. Security Redirect
  useEffect(() => {
    if (user !== undefined) {
      if (!user || user.role !== "admin") {
        router.push("/");
      }
    }
  }, [user, router]);

  // Form State
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", description: "", price: 0, capacity: 10, date: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleCancel = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure you want to cancel this booking? This will restore the tour capacity.")) {
      return;
    }

    try {
      await cancelBooking({ bookingId });
      // The UI will update automatically because of Convex reactivity!
    } catch (error) {
      console.error(error);
      alert("Failed to cancel booking. Check console.");
    }
  };

  // 3. Early return for loading/security
  if (user === undefined || (user && user.role !== "admin")) {
    return <div className="p-10 text-center">Verifying permissions...</div>;
  }

  // Helper function to upload a single file
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
      // 1. Handle Cover Image Upload
      let coverImageId: Id<"_storage"> | undefined = undefined;
      const coverFile = imageInput.current?.files?.[0];
      if (coverFile) {
        coverImageId = await uploadFile(coverFile);
      }

      // 2. Handle Gallery Images Upload
      const galleryImageIds: Id<"_storage">[] = [];
      const galleryFiles = galleryInput.current?.files;
      if (galleryFiles && galleryFiles.length > 0) {
        const uploadPromises = Array.from(galleryFiles).map(uploadFile);
        const results = await Promise.all(uploadPromises);
        galleryImageIds.push(...results);
      }

      // 3. Save Tour to Database (CORRECTED BLOCK)
      await createTour({
        // Do NOT use ...form here. List fields explicitly:
        title: form.title,
        description: form.description,
        price: Number(form.price) * 100, // Convert to cents
        capacity: Number(form.capacity),
        startDate: form.date ? new Date(form.date).getTime() : Date.now(),
        coverImageId,
        galleryImageIds,
      });

      alert("Tour Created Successfully!");

      // Reset Form & Inputs
      setForm({ title: "", description: "", price: 0, capacity: 10, date: "" });
      if (imageInput.current) imageInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";

    } catch (error) {
      console.error(error);
      alert("Failed to create tour. See console.");
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

        {/* VIEW BOOKINGS TAB */}
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
                            variant="destructive" // Red color for danger
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

        {/* CREATE TOUR TAB */}
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

                {/* DATE INPUT */}
                <div className="grid gap-2">
                  <label>Start Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                {/* IMAGE INPUT */}
                <div className="grid gap-2">
                  <label>Cover Image</label>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={imageInput}
                  />
                </div>

                {/* NEW GALLERY INPUT */}
                <div className="grid gap-2">
                  <label>Gallery Images (Select Multiple)</label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple  // <-- Crucial attribute
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