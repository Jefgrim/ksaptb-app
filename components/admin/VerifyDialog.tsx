"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, X, ExternalLink, CreditCard, AlertCircle } from "lucide-react";
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
        
        // Safety confirm for rejection
        if (action === "reject" && !confirm("Are you sure? This will cancel the booking and release seats.")) {
            return;
        }

        setIsProcessing(true);
        try {
            await verify({ bookingId, action });
            toast.success(action === "approve" ? "Payment Approved" : "Booking Rejected");
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            // Show the specific error message from the backend (e.g. "Already paid")
            toast.error(error.message || "Action failed");
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate total in SAR
    const totalAmount = booking ? (booking.tourPrice * booking.ticketCount) / 100 : 0;
    
    // Check if actions should be visible
    const isPendingReview = booking?.paymentStatus === "reviewing";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <DialogTitle>Verify Payment Proof</DialogTitle>
                            <DialogDescription>Review the bank transfer details below.</DialogDescription>
                        </div>
                        {/* Status Badge in Header */}
                        {booking && (
                            <Badge variant={
                                booking.paymentStatus === "paid" ? "default" :
                                booking.paymentStatus === "rejected" ? "destructive" :
                                "outline"
                            } className={booking.paymentStatus === "paid" ? "bg-green-600" : ""}>
                                {booking.paymentStatus.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                {booking === undefined ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : !booking ? (
                    <div className="p-4 text-red-500">Booking not found</div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6 mt-2">
                        
                        {/* LEFT: DETAILS */}
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-5 rounded-lg space-y-4 border shadow-sm">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <span className="text-slate-500 text-sm">Amount Due</span>
                                    <span className="font-bold text-xl text-green-700">SAR {totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Customer</span>
                                        <span className="font-medium">{booking.userName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Email</span>
                                        <span className="font-medium">{booking.userEmail}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tour Date</span>
                                        <span className="font-medium">
                                            {new Date(booking.tourDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                <span className="text-xs font-bold text-amber-800 uppercase block mb-1">
                                    Customer Note / IBAN
                                </span>
                                <p className="font-mono text-sm break-all text-amber-900">
                                    {booking.refundDetails || "No details provided"}
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: IMAGE */}
                        <div className="space-y-2">
                             <span className="text-sm font-semibold text-slate-700">Uploaded Receipt</span>
                             <div className="border rounded-lg overflow-hidden bg-slate-100 h-[300px] flex items-center justify-center relative group">
                                {booking.proofUrl ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={booking.proofUrl} 
                                            alt="Proof" 
                                            className="h-full w-full object-contain" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <a 
                                                href={booking.proofUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="bg-white text-slate-900 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 hover:bg-slate-50 shadow-lg"
                                            >
                                                <ExternalLink className="w-4 h-4" /> Open Full Image
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <CreditCard className="w-10 h-10 mb-2 opacity-50" />
                                        <p className="text-sm">No receipt uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0 mt-6 border-t pt-6">
                    {/* CONDITIONAL RENDERING: Only show buttons if Reviewing */}
                    {booking && isPendingReview ? (
                        <div className="flex w-full gap-3 sm:justify-end">
                            <Button 
                                variant="destructive" 
                                disabled={isProcessing} 
                                onClick={() => handleAction("reject")} 
                                className="flex-1 sm:flex-none"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4 mr-2" />}
                                Reject
                            </Button>
                            <Button 
                                disabled={isProcessing} 
                                onClick={() => handleAction("approve")}
                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4 mr-2" />}
                                Approve Payment
                            </Button>
                        </div>
                    ) : (
                        // If already processed, show this instead
                        <div className="w-full flex items-center justify-center p-2 bg-slate-50 rounded text-slate-500 text-sm italic border">
                           <AlertCircle className="w-4 h-4 mr-2" />
                           This booking has already been processed ({booking?.paymentStatus}).
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}