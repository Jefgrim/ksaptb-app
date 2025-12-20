"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarIcon, Banknote, Users, Image as ImageIcon, Type, Loader2, AlignLeft } from "lucide-react";

export function CreateTourForm() {
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  const createTour = useMutation(api.tours.create);
  
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({ 
    title: "", 
    description: "", 
    price: 0, 
    capacity: 10, 
    date: "" 
  });

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

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

    if (form.date < todayStr) {
      toast.error("Please select a future date (Saudi Time).");
      return;
    }

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

      const ksaDateTimestamp = new Date(`${form.date}T00:00:00+03:00`).getTime();

      await createTour({
        title: form.title,
        description: form.description,
        price: Number(form.price) * 100, 
        capacity: Number(form.capacity),
        startDate: ksaDateTimestamp,
        coverImageId,
        galleryImageIds,
      });

      toast.success("Tour Created Successfully!");
      setForm({ title: "", description: "", price: 0, capacity: 10, date: "" });
      if (imageInput.current) imageInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
      
    } catch (error) {
      console.error(error);
      toast.error("Failed to create tour. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // FIX 1: Added 'mx-auto' to center the card
    <Card className="max-w-2xl mx-auto shadow-lg border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-xl">
          Create New Tour
        </CardTitle>
        <CardDescription>
          Fill in the details below. Use dashes (-) for bullet points in the description.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* TITLE & DATE ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2 font-semibold">
                <Type className="w-4 h-4 text-blue-500" /> 
                Tour Title
              </Label>
              <Input 
                id="title"
                placeholder="e.g. Edge of the World" 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2 font-semibold">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                Date (KSA)
              </Label>
              <Input 
                id="date"
                type="date" 
                min={todayStr} 
                value={form.date} 
                onChange={(e) => setForm({ ...form, date: e.target.value })} 
                required 
              />
            </div>
          </div>

          {/* PRICE & CAPACITY ROW */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-2 font-semibold">
                <Banknote className="w-4 h-4 text-blue-500" />
                Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-bold">SAR</span>
                <Input 
                  id="price"
                  type="number" 
                  min="1"
                  placeholder="0.00"
                  className="pl-12 font-mono"
                  value={form.price || ''} 
                  onChange={(e) => setForm({ ...form, price: +e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity" className="flex items-center gap-2 font-semibold">
                <Users className="w-4 h-4 text-blue-500" />
                Capacity
              </Label>
              <Input 
                id="capacity"
                type="number" 
                min="1"
                placeholder="10"
                value={form.capacity || ''} 
                onChange={(e) => setForm({ ...form, capacity: +e.target.value })} 
                required 
              />
            </div>
          </div>

          {/* DESCRIPTION - Styled to look like an editor */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 font-semibold">
              <AlignLeft className="w-4 h-4 text-blue-500" />
              Itinerary & Details
            </Label>
            <Textarea 
              id="description"
              placeholder="Provide a detailed description of the tour." 
              className="min-h-[150px] font-normal leading-relaxed text-base"
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              required 
            />
          </div>  

          <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            {/* IMAGE UPLOADS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 cursor-pointer text-sm" htmlFor="cover_image">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    Cover Image
                  </Label>
                  <Input 
                    id="cover_image"
                    type="file" 
                    accept="image/*"
                    ref={imageInput}
                    className="bg-white text-xs cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 cursor-pointer text-sm" htmlFor="gallery_images">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    Gallery Images
                  </Label>
                  <Input 
                    id="gallery_images"
                    type="file" 
                    multiple
                    accept="image/*"
                    ref={galleryInput}
                    className="bg-white text-xs cursor-pointer"
                  />
                </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full font-bold h-11 text-lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Uploading...
              </>
            ) : (
              "Publish Tour"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}