"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { ConvexError } from "convex/values";

export function TourList() {
  const tours = useQuery(api.tours.list);
  
  // Mutations
  const deleteTour = useMutation(api.tours.deleteTour);
  const updateTour = useMutation(api.tours.update);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);

  // State
  const [editingId, setEditingId] = useState<Id<"tours"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for file inputs
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  // Form State
  const [editForm, setEditForm] = useState({
    title: "", description: "", price: 0, capacity: 0, date: "",
  });

  // --- HELPERS ---

  const uploadFile = async (file: File) => {
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    return storageId as Id<"_storage">;
  };

  // UPDATED DELETE HANDLER
  const handleDelete = async (id: Id<"tours">) => {
    if (!confirm("Delete this tour permanently?")) return;
    
    try {
      await deleteTour({ id });
      toast.success("Tour deleted");
    } catch (error: any) {
      console.error("Delete Error:", error);
      
      const errorMessage = 
        error instanceof ConvexError ? (error.data as string) : 
        (error.data && typeof error.data === "string") ? error.data :
        "Unexpected error occurred";

      toast.error(errorMessage);
    }
  };

  const openEdit = (tour: any) => {
    setEditingId(tour._id);
    setEditForm({
      title: tour.title,
      description: tour.description,
      price: tour.price / 100,
      capacity: tour.capacity,
      date: new Date(tour.startDate).toISOString().split('T')[0],
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsSubmitting(true);

    try {
      // 1. Handle Cover Image
      let newCoverImageId: Id<"_storage"> | undefined = undefined;
      if (imageInput.current?.files?.[0]) {
        newCoverImageId = await uploadFile(imageInput.current.files[0]);
      }

      // 2. Handle Gallery Images
      let newGalleryIds: Id<"_storage">[] | undefined = undefined;
      if (galleryInput.current?.files && galleryInput.current.files.length > 0) {
        newGalleryIds = await Promise.all(
          Array.from(galleryInput.current.files).map(uploadFile)
        );
      }

      // 3. Send Update
      await updateTour({
        id: editingId,
        title: editForm.title,
        description: editForm.description,
        price: Number(editForm.price) * 100,
        capacity: Number(editForm.capacity),
        startDate: new Date(editForm.date).getTime(),
        ...(newCoverImageId && { coverImageId: newCoverImageId }),
        ...(newGalleryIds && { galleryImageIds: newGalleryIds }),
      });

      toast.success("Tour updated successfully!");
      setEditingId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update tour");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Current Tour Packages</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours?.map((tour) => (
              <TableRow key={tour._id}>
                <TableCell>
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                    {tour.imageUrl && <img src={tour.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{tour.title}</TableCell>
                <TableCell>${(tour.price / 100).toFixed(2)}</TableCell>
                <TableCell>{tour.bookedCount} / {tour.capacity}</TableCell>
                <TableCell className="text-right space-x-2">
                  
                  {/* EDIT DIALOG */}
                  <Dialog open={editingId === tour._id} onOpenChange={(open) => !open && setEditingId(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => openEdit(tour)}>Edit</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Edit Tour</DialogTitle></DialogHeader>
                      <form onSubmit={handleUpdate} className="space-y-4 mt-4">
                        
                        <div className="grid gap-2">
                          <Label>Title</Label>
                          <Input value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Price ($)</Label>
                            <Input type="number" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: +e.target.value})} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Capacity</Label>
                            <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm({...editForm, capacity: +e.target.value})} />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Date</Label>
                          <Input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Input value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                        </div>

                        {/* Image Inputs */}
                        <div className="grid gap-2 p-3 bg-gray-50 rounded border">
                          <Label className="font-bold">Update Images</Label>
                          <div className="text-xs text-gray-500 mb-2">
                            Current Cover: {tour.coverImageId ? "✅ Set" : "❌ None"}
                          </div>
                          <Label className="text-xs">Replace Cover Image (Optional)</Label>
                          <Input type="file" accept="image/*" ref={imageInput} />
                          <div className="h-2"></div>
                          <Label className="text-xs">Replace Gallery (Optional)</Label>
                          <Input type="file" accept="image/*" multiple ref={galleryInput} />
                          <p className="text-[10px] text-gray-400">Uploading gallery images here will replace the entire existing gallery.</p>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button variant="destructive" size="sm" onClick={() => handleDelete(tour._id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}