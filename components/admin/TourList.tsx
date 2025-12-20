"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Make sure you have this
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarIcon, Banknote, Users, Image as ImageIcon, Type, AlignLeft, Loader2, Trash2, Edit } from "lucide-react";

export function TourList() {
  const tours = useQuery(api.tours.list);
  const deleteTour = useMutation(api.tours.deleteTour);
  const updateTour = useMutation(api.tours.update);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);

  const [editingId, setEditingId] = useState<Id<"tours"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for file inputs
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    title: "", description: "", price: 0, capacity: 0, date: "",
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

  const handleDelete = async (id: Id<"tours">) => {
    if (!confirm("Are you sure you want to delete this tour? This action cannot be undone.")) return;
    try {
      await deleteTour({ id });
      toast.success("Tour deleted");
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error("Failed to delete tour");
    }
  };

  const openEdit = (tour: any) => {
    setEditingId(tour._id);

    // Convert stored timestamp back to KSA date string for the input
    const ksaDateStr = new Date(tour.startDate).toLocaleDateString("en-CA", {
      timeZone: "Asia/Riyadh"
    });

    setEditForm({
      title: tour.title,
      description: tour.description,
      price: tour.price / 100, // Convert cents to SAR
      capacity: tour.capacity,
      date: ksaDateStr,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    if (editForm.date < todayStr) {
      toast.error("Cannot set a past date (Saudi Time).");
      return;
    }

    setIsSubmitting(true);

    try {
      let newCoverImageId: Id<"_storage"> | undefined = undefined;
      if (imageInput.current?.files?.[0]) {
        newCoverImageId = await uploadFile(imageInput.current.files[0]);
      }

      let newGalleryIds: Id<"_storage">[] | undefined = undefined;
      if (galleryInput.current?.files && galleryInput.current.files.length > 0) {
        newGalleryIds = await Promise.all(
          Array.from(galleryInput.current.files).map(uploadFile)
        );
      }

      const ksaDateTimestamp = new Date(`${editForm.date}T00:00:00+03:00`).getTime();

      await updateTour({
        id: editingId,
        title: editForm.title,
        description: editForm.description,
        price: Number(editForm.price) * 100,
        capacity: Number(editForm.capacity),
        startDate: ksaDateTimestamp,
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
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <CardTitle>Current Tour Packages</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
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
                  <div className="w-12 h-12 bg-slate-100 rounded-md overflow-hidden border border-slate-200">
                    {tour.imageUrl ? (
                      <img src={tour.imageUrl} className="w-full h-full object-cover" alt="Tour cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 m-auto text-slate-300 mt-3" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-slate-900">{tour.title}</TableCell>
                <TableCell className="font-mono text-slate-600">SAR {(tour.price / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tour.bookedCount >= tour.capacity 
                      ? "bg-red-100 text-red-700" 
                      : "bg-green-100 text-green-700"
                  }`}>
                    {tour.bookedCount} / {tour.capacity}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    
                    {/* EDIT DIALOG */}
                    <Dialog open={editingId === tour._id} onOpenChange={(open) => !open && setEditingId(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(tour)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Tour Details</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleUpdate} className="space-y-6 mt-4">
                          
                          {/* TITLE & DATE */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold">
                                <Type className="w-3 h-3" /> Title
                              </Label>
                              <Input 
                                value={editForm.title} 
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold">
                                <CalendarIcon className="w-3 h-3" /> Date
                              </Label>
                              <Input 
                                type="date" 
                                min={todayStr} 
                                value={editForm.date} 
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} 
                              />
                            </div>
                          </div>

                          {/* PRICE & CAPACITY */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold">
                                <Banknote className="w-3 h-3" /> Price (SAR)
                              </Label>
                              <Input 
                                type="number" 
                                min='1' 
                                value={editForm.price} 
                                onChange={(e) => setEditForm({ ...editForm, price: +e.target.value })} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold">
                                <Users className="w-3 h-3" /> Capacity
                              </Label>
                              <Input 
                                type="number" 
                                min='1' 
                                value={editForm.capacity} 
                                onChange={(e) => setEditForm({ ...editForm, capacity: +e.target.value })} 
                              />
                            </div>
                          </div>

                          {/* DESCRIPTION */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs text-slate-500 uppercase font-bold">
                              <AlignLeft className="w-3 h-3" /> Description
                            </Label>
                            <Textarea 
                              value={editForm.description} 
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
                              className="min-h-[120px]"
                              placeholder="- Use dashes for bullet points"
                            />
                            <p className="text-[10px] text-slate-400">Use dashes (-) to create list items.</p>
                          </div>

                          {/* IMAGE UPDATES */}
                          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <Label className="flex items-center gap-2 font-semibold">
                              <ImageIcon className="w-4 h-4 text-slate-500" /> Update Images
                            </Label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500 mb-1 block">Replace Cover Image</Label>
                                    <Input type="file" accept="image/*" ref={imageInput} className="bg-white text-xs h-9" />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500 mb-1 block">Replace Gallery (All)</Label>
                                    <Input type="file" accept="image/*" multiple ref={galleryInput} className="bg-white text-xs h-9" />
                                </div>
                            </div>
                            <p className="text-[10px] text-orange-500">
                              Note: Uploading new images will completely replace the existing ones.
                            </p>
                          </div>

                          {/* FOOTER ACTIONS */}
                          <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                            </Button>
                          </div>

                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* DELETE BUTTON */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(tour._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>

                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}