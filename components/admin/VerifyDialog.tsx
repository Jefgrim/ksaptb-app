"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Check, X, ExternalLink, CreditCard } from "lucide-react";
import { useState } from "react";

interface VerifyDialogProps {
    bookingId: Id<"bookings"> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VerifyDialog({ bookingId, open, onOpenChange }: VerifyDialogProps) {
    // 1. Fetch data only when a booking is selected
    const booking = useQuery(api.bookings.getBookingForAdmin, bookingId ? { bookingId } : "skip");
    const verify = useMutation(api.bookings.verifyPayment);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAction = async (action: "approve" | "reject") => {
        if (!bookingId) return;
        setIsProcessing(true);
        try {
            await verify({ bookingId, action });
            toast.success(action === "approve" ? "Payment Approved" : "Booking Rejected");
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Action failed");
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate total in SAR (assuming price is in cents)
    const totalAmount = booking ? (booking.tourPrice * booking.ticketCount) / 100 : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Verify Payment Proof</DialogTitle>
                    <DialogDescription>Review the bank transfer details below.</DialogDescription>
                </DialogHeader>

                {booking === undefined ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : !booking ? (
                    <div className="p-4 text-red-500">Booking not found</div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* LEFT: DETAILS */}
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg space-y-3 border">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">Amount Due:</span>
                                    <span className="font-bold text-lg text-green-700">SAR {totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">Customer:</span>
                                    <span className="font-medium">{booking.userName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">Email:</span>
                                    <span className="font-medium text-xs">{booking.userEmail}</span>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 space-y-1">
                                <span className="text-xs font-bold text-amber-800 uppercase">Refund Details (IBAN)</span>
                                <p className="font-mono text-sm break-all text-amber-900">
                                    {booking.refundDetails || "Not provided"}
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: IMAGE */}
                        <div className="space-y-2">
                             <span className="text-sm font-semibold text-slate-700">Uploaded Receipt</span>
                             <div className="border rounded-lg overflow-hidden bg-black/5 min-h-[250px] flex items-center justify-center relative group">
                                {booking.proofUrl ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={booking.proofUrl} 
                                            alt="Proof" 
                                            className="max-h-[300px] w-full object-contain" 
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <a 
                                                href={booking.proofUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="text-white flex items-center gap-2 hover:underline"
                                            >
                                                <ExternalLink className="w-4 h-4" /> Open Full Size
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <CreditCard className="w-8 h-8 mb-2 opacity-50" />
                                        <p className="text-sm">No receipt uploaded yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4">
                    <Button 
                        variant="destructive" 
                        disabled={isProcessing} 
                        onClick={() => handleAction("reject")} 
                        className="w-full sm:w-auto"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4 mr-2" />}
                        Reject & Cancel
                    </Button>
                    <Button 
                        disabled={isProcessing} 
                        onClick={() => handleAction("approve")}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4 mr-2" />}
                        Approve Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}