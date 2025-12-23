"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import {
  Image as ImageIcon,
  Loader2,
  Trash2,
  Edit,
  AlertCircle,
  RefreshCw,
  Upload,
  ExternalLink,
  CheckCircle2,
  FileText,
  AlertTriangle,
  X
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- SUB-COMPONENT: REFUND MANAGER ---
function RefundManager({ tourId }: { tourId: Id<"tours"> }) {
  const bookings = useQuery(api.bookings.getBookingsByTour, { tourId });
  const processRefund = useMutation(api.bookings.processAdminRefund);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);

  const bookingsToRefund = bookings?.filter(b => b.status === "confirmed") || [];
  const refundedBookings = bookings?.filter(b => b.status === "refunded") || [];

  const [uploadingId, setUploadingId] = useState<Id<"bookings"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadRefund = async (bookingId: Id<"bookings">, file: File) => {
    setUploadingId(bookingId);
    try {
      const postUrl = await generateUploadUrl();
      const uploadRes = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { storageId } = await uploadRes.json();

      await processRefund({ bookingId, proofImageId: storageId });
      toast.success("Refund processed successfully");
    } catch (error) {
      toast.error("Failed to process refund");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-800">Tour Cancelled</h4>
          <p className="text-sm text-amber-700 mt-1">
            Process refunds for confirmed bookings below. Uploading proof will notify the user.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-sm uppercase text-slate-500 flex items-center gap-2">
          Pending Refunds <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs text-slate-900">{bookingsToRefund.length}</span>
        </h3>

        {bookingsToRefund.length === 0 && (
          <div className="text-sm text-slate-400 italic p-4 border border-dashed rounded text-center">
            All refunds have been processed.
          </div>
        )}

        {bookingsToRefund.map(booking => (
          <Card key={booking._id} className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="pt-4 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">{booking.userName}</p>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                    {booking.ticketCount} tickets
                  </span>
                </div>
                <p className="text-slate-500">{booking.contactNumber || "No Contact Info"}</p>
                <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded font-mono text-xs max-w-md">
                  <p className="font-bold text-slate-400 text-[10px] uppercase mb-1">Customer Refund Details:</p>
                  <p className="whitespace-pre-wrap text-slate-700">{booking.refundDetails || "No details provided by user yet."}</p>
                </div>
                <p className="mt-1 font-bold text-green-700">
                  Refund Amount: SAR {(booking.tourPrice * booking.ticketCount / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleUploadRefund(booking._id, e.target.files[0])}
                />
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={uploadingId === booking._id}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingId === booking._id ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Transfer Proof
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {refundedBookings.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h3 className="font-bold text-sm uppercase text-slate-500 flex items-center gap-2">
            Completed History <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs text-slate-900">{refundedBookings.length}</span>
          </h3>
          <div className="grid gap-3">
            {refundedBookings.map(booking => (
              <div key={booking._id} className="group flex justify-between items-center text-sm p-4 bg-white rounded-lg border border-slate-200 hover:border-green-300 transition-colors shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{booking.userName}</p>
                    <p className="text-xs text-slate-500">Ref: {booking._id.slice(-6)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
                        <FileText className="w-4 h-4 mr-2" /> Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Refund Record</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-500">Customer Bank Details</Label>
                          <div className="p-3 bg-slate-100 rounded mt-1 font-mono text-sm">
                            {booking.refundDetails}
                          </div>
                        </div>
                        {booking.proofUrl ? (
                          <div>
                            <Label className="text-slate-500">Proof of Payment</Label>
                            <div className="mt-2 border rounded-lg overflow-hidden relative h-48 w-full bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={booking.proofUrl} alt="Proof" className="object-contain w-full h-full" />
                            </div>
                            <a href={booking.proofUrl} target="_blank" rel="noreferrer">
                              <Button variant="outline" className="w-full mt-2">
                                <ExternalLink className="w-4 h-4 mr-2" /> Open Full Image
                              </Button>
                            </a>
                          </div>
                        ) : (
                          <div className="text-amber-600 text-sm bg-amber-50 p-2 rounded">
                            Proof image ID exists but URL generation missing in backend query.
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="text-green-600 font-bold text-xs bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    REFUNDED
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// --- MAIN COMPONENT ---
export function TourList() {
  const tours = useQuery(api.tours.list);
  const deleteTour = useMutation(api.tours.deleteTour);
  const cancelTour = useMutation(api.tours.cancelTour);
  const updateTour = useMutation(api.tours.update);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);

  const [editingId, setEditingId] = useState<Id<"tours"> | null>(null);
  const [refundDialogId, setRefundDialogId] = useState<Id<"tours"> | null>(null);
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

  const handleCancelTour = async (tour: any) => {
    if (tour.hasPendingBookings) {
      toast.error("Cannot cancel tour with PENDING bookings. Please Accept or Reject them first.");
      return;
    }

    if (!confirm("Are you sure you want to CANCEL this tour? This will stop new bookings and require you to refund existing customers.")) return;

    try {
      await cancelTour({ id: tour._id });
      toast.success("Tour cancelled. Please check refund status.");
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to cancel tour");
    }
  };

  const handleDelete = async (id: Id<"tours">) => {
    if (!confirm("Delete this tour?")) return;
    try {
      await deleteTour({ id });
      toast.success("Tour deleted");
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to delete tour");
    }
  };

  const openEdit = (tour: any) => {
    const ksaDateStr = new Date(tour.startDate).toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
    setEditForm({
      title: tour.title,
      description: tour.description,
      price: tour.price / 100,
      capacity: tour.capacity,
      date: ksaDateStr,
    });
    setEditingId(tour._id); // This triggers the modal to open
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
      if (imageInput.current?.files?.[0]) newCoverImageId = await uploadFile(imageInput.current.files[0]);

      let newGalleryIds: Id<"_storage">[] | undefined = undefined;
      if (galleryInput.current?.files && galleryInput.current.files.length > 0) {
        newGalleryIds = await Promise.all(Array.from(galleryInput.current.files).map(uploadFile));
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

      toast.success("Tour updated!");
      setEditingId(null);
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours?.map((tour: any) => (
                <TableRow key={tour._id} className={tour.cancelled ? "bg-red-50" : ""}>
                  <TableCell>
                    {tour.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tour.imageUrl} alt={tour.title} className="w-12 h-12 object-cover rounded-md" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center">
                        <ImageIcon className="text-slate-300 w-6 h-6" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p>{tour.title}</p>
                      <p className="text-xs text-slate-500">{new Date(tour.startDate).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{tour.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>SAR {tour.price / 100}</TableCell>
                  <TableCell>
                    {tour.cancelled ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">

                      {tour.cancelled ? (
                        <Dialog open={refundDialogId === tour._id} onOpenChange={(open) => !open && setRefundDialogId(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => setRefundDialogId(tour._id)}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" /> Manage Refunds
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Refund Manager - {tour.title}</DialogTitle>
                            </DialogHeader>
                            <RefundManager tourId={tour._id} />
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tour)}>
                            <Edit className="h-4 w-4" />
                          </Button>

                          {tour.hasPendingBookings ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="inline-block cursor-not-allowed">
                                  <Button disabled variant="ghost" size="icon" className="h-8 w-8 text-slate-300">
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Resolve Pending bookings first</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleCancelTour(tour)}
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}

                      {tour.bookedCount === 0 && !tour.cancelled && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(tour._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- EDIT MODAL --- */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tour Package</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (SAR)</Label>
                <Input
                  id="price"
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date (Saudi Time)</Label>
              <Input
                id="date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover">New Cover Image (Optional)</Label>
              <Input id="cover" type="file" ref={imageInput} accept="image/*" className="cursor-pointer" />
              <p className="text-[10px] text-slate-500">Leaving this blank keeps the current image.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gallery">New Gallery Images (Optional)</Label>
              <Input id="gallery" type="file" ref={galleryInput} multiple accept="image/*" className="cursor-pointer" />
              <p className="text-[10px] text-slate-500">Uploading new images here will REPLACE the existing gallery.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
                className="h-32"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}