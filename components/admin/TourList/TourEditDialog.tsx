"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TourEditDialogProps {
  tour: Doc<"tours"> | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TourEditDialog({ tour, isOpen, onClose }: TourEditDialogProps) {
  const updateTour = useMutation(api.tours.update);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

  // Initialize state based on tour prop when it opens
  // Note: We use a key={tour._id} in the parent to force re-render, 
  // or use useEffect to sync state. 
  // For simplicity, we'll assume the parent conditionally renders this component.
  
  const [form, setForm] = useState({
    title: tour?.title || "",
    description: tour?.description || "",
    price: tour ? tour.price / 100 : 0,
    capacity: tour?.capacity || 0,
    date: tour ? new Date(tour.startDate).toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }) : "",
  });

  if (!tour) return null;

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let newCoverImageId: Id<"_storage"> | undefined = undefined;
      if (imageInput.current?.files?.[0]) newCoverImageId = await uploadFile(imageInput.current.files[0]);

      let newGalleryIds: Id<"_storage">[] | undefined = undefined;
      if (galleryInput.current?.files && galleryInput.current.files.length > 0) {
        newGalleryIds = await Promise.all(Array.from(galleryInput.current.files).map(uploadFile));
      }

      const ksaDateTimestamp = new Date(`${form.date}T00:00:00+03:00`).getTime();

      await updateTour({
        id: tour._id,
        title: form.title,
        description: form.description,
        price: Number(form.price) * 100,
        capacity: Number(form.capacity),
        startDate: ksaDateTimestamp,
        ...(newCoverImageId && { coverImageId: newCoverImageId }),
        ...(newGalleryIds && { galleryImageIds: newGalleryIds }),
      });

      toast.success("Tour updated!");
      onClose();
    } catch (error) {
      toast.error("Failed to update");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tour Package</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (SAR)</Label>
              <Input id="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date (Saudi Time)</Label>
            <Input id="date" type="date" value={form.date} min={todayStr} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover">New Cover Image (Optional)</Label>
            <Input id="cover" type="file" ref={imageInput} accept="image/*" className="cursor-pointer" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gallery">New Gallery Images (Optional)</Label>
            <Input id="gallery" type="file" ref={galleryInput} multiple accept="image/*" className="cursor-pointer" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="h-32" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-2" />} Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}