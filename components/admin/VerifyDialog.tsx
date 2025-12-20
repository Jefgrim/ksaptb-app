"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";

interface VerifyDialogProps {
    bookingId: Id<"bookings"> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VerifyDialog({ bookingId, open, onOpenChange }: VerifyDialogProps) {
    // Conditional query: only run if bookingId exists
    const booking = useQuery(api.bookings.getBookingForAdmin, bookingId ? { bookingId } : "skip");
    const verify = useMutation(api.bookings.verifyPayment);

    const handleAction = async (action: "approve" | "reject") => {
        if (!bookingId) return;
        try {
            await verify({ bookingId, action });
            toast.success(`Booking ${action}d successfully`);
            onOpenChange(false);
        } catch (error) {
            toast.error("Action failed");
        }
    };

    if (!bookingId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Verify Payment Proof</DialogTitle>
                </DialogHeader>

                {booking === undefined ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : !booking ? (
                    <div>Booking not found</div>
                ) : (
                    <div className="space-y-4">
                        {/* DETAILS */}
                        <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2 border">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Amount Due:</span>
                                <span className="font-bold">SAR {(booking.tourPrice * booking.ticketCount / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Customer:</span>
                                <span>{booking.userName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Refund IBAN:</span>
                                <span className="font-mono text-xs">{booking.refundDetails || "Not provided"}</span>
                            </div>
                        </div>

                        {/* IMAGE */}
                        <div className="border rounded-lg overflow-hidden bg-black/5 min-h-[200px] flex items-center justify-center">
                            {booking.proofUrl ? (
                                <a href={booking.proofUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={booking.proofUrl} alt="Proof" className="max-h-[400px] w-auto object-contain hover:opacity-90 transition-opacity cursor-zoom-in" />
                                </a>
                            ) : (
                                <p className="text-slate-400 text-sm">No image uploaded yet</p>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="destructive" onClick={() => handleAction("reject")} className="w-full sm:w-auto">
                                <X className="w-4 h-4 mr-2" /> Reject
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={() => handleAction("approve")}>
                                <Check className="w-4 h-4 mr-2" /> Approve Payment
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}