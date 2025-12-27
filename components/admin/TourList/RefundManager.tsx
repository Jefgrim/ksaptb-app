"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Loader2, Upload, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function RefundManager({ tourId }: { tourId: Id<"tours"> }) {
  const bookings = useQuery(api.bookings.getBookingsByTour, { tourId });
  const processRefund = useMutation(api.bookings.processAdminRefund);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);

  const bookingsToRefund = bookings?.filter((b) => b.status === "confirmed") || [];
  const refundedBookings = bookings?.filter((b) => b.status === "refunded") || [];

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
      {/* Alert Header */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-800">Tour Cancelled</h4>
          <p className="text-sm text-amber-700 mt-1">
            Process refunds for confirmed bookings below. Uploading proof will notify the user.
          </p>
        </div>
      </div>

      {/* Pending Refunds Section */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm uppercase text-slate-500 flex items-center gap-2">
          Pending Refunds <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs text-slate-900">{bookingsToRefund.length}</span>
        </h3>

        {bookingsToRefund.length === 0 && (
          <div className="text-sm text-slate-400 italic p-4 border border-dashed rounded text-center">
            All refunds have been processed.
          </div>
        )}

        {bookingsToRefund.map((booking) => (
          <Card key={booking._id} className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="pt-4 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">{booking.userName}</p>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{booking.ticketCount} tickets</span>
                </div>
                <p className="text-slate-500">{booking.contactNumber || "No Contact Info"}</p>
                <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded font-mono text-xs max-w-md">
                   <p className="font-bold text-slate-400 text-[10px] uppercase mb-1">Customer Refund Details:</p>
                   <p className="whitespace-pre-wrap text-slate-700">{booking.refundDetails || "No details provided by user yet."}</p>
                </div>
                <p className="mt-1 font-bold text-green-700">Refund: SAR {((booking.tourPrice * booking.ticketCount) / 100).toFixed(2)}</p>
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

      {/* History Section */}
      {refundedBookings.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h3 className="font-bold text-sm uppercase text-slate-500 flex items-center gap-2">
            Completed History <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs text-slate-900">{refundedBookings.length}</span>
          </h3>
          <div className="grid gap-3">
            {refundedBookings.map((booking) => (
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
                      <DialogHeader><DialogTitle>Refund Record</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-500">Customer Bank Details</Label>
                          <div className="p-3 bg-slate-100 rounded mt-1 font-mono text-sm">{booking.refundDetails}</div>
                        </div>
                        {booking.proofUrl && (
                          <div>
                            <Label className="text-slate-500">Proof of Payment</Label>
                            <div className="mt-2 border rounded-lg overflow-hidden relative h-48 w-full bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={booking.proofUrl} alt="Proof" className="object-contain w-full h-full" />
                            </div>
                            <a href={booking.proofUrl} target="_blank" rel="noreferrer">
                              <Button variant="outline" className="w-full mt-2"><ExternalLink className="w-4 h-4 mr-2" /> Open Full Image</Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="text-green-600 font-bold text-xs bg-green-50 px-3 py-1 rounded-full border border-green-100">REFUNDED</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}