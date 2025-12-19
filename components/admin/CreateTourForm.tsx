"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export function CreateTourForm() {
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  const createTour = useMutation(api.tours.create);
  
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: 0, capacity: 10, date: "" });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let coverImageId: Id<"_storage"> | undefined;
      if (imageInput.current?.files?.[0]) {
        coverImageId = await uploadFile(imageInput.current.files[0]);
      }

      const galleryImageIds: Id<"_storage">[] = [];
      if (galleryInput.current?.files) {
        const files = Array.from(galleryInput.current.files);
        galleryImageIds.push(...await Promise.all(files.map(uploadFile)));
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

      toast.success("Tour Created!");
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
    <Card className="max-w-xl">
      <CardHeader><CardTitle>Add New Package</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Tour Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
             <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} required />
             <Input type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} required />
          </div>
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div><label className="text-sm">Cover Image</label><Input type="file" ref={imageInput} /></div>
          <div><label className="text-sm">Gallery</label><Input type="file" multiple ref={galleryInput} /></div>
          <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Uploading..." : "Publish Tour"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}