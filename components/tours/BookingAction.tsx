"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
// Added "Lock" icon
import { Loader2, Landmark, Upload, Info, Timer, X, ArrowLeft, Phone, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

const ENABLE_STRIPE = false; 

interface BookingActionProps {
  tourId: Id<"tours">;
  price: number; 
  capacity: number;
  bookedCount: number;
  startDate: number;
}

export function BookingAction({ tourId, price, capacity, bookedCount, startDate }: BookingActionProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  // --- CONVEX HOOKS ---
  const reserveBooking = useMutation(api.bookings.reserve);
  const confirmBooking = useMutation(api.bookings.confirm);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  
  // Safe Query: Skip if guest
  const activeHolding = useQuery(
    api.bookings.getMyActiveHolding, 
    isSignedIn ? { tourId } : "skip"
  );

  // --- STATE ---
  const [step, setStep] = useState<"details" | "payment">("details");
  const [ticketCount, setTicketCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "transfer">(ENABLE_STRIPE ? "stripe" : "transfer");
  
  const [refundDetails, setRefundDetails] = useState("");
  const [contactNumber, setContactNumber] = useState(""); 
  
  const [bookingId, setBookingId] = useState<Id<"bookings"> | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const remaining = capacity - bookedCount;
  const displayPrice = (price * (step === "payment" && activeHolding ? activeHolding.ticketCount : ticketCount) / 100);

  // --- EFFECTS ---
  useEffect(() => {
    if (activeHolding) {
        setBookingId(activeHolding._id);
        setExpiresAt(activeHolding.expiresAt || null);
        setTicketCount(activeHolding.ticketCount);
        setStep("payment");
    }
  }, [activeHolding]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
        const diff = expiresAt - Date.now();
        if (diff <= 0) {
            setTimeLeft("Expired");
            if(step === "payment") {
                toast.error("Reservation expired");
                window.location.reload();
            }
        } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
        }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, step]);

  // --- HANDLERS ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    if(fileInput.current) fileInput.current.value = "";
  };

  const handleReserve = async () => {
    setIsProcessing(true);
    try {
        const result = await reserveBooking({
            tourId,
            ticketCount,
        });
        setBookingId(result.bookingId);
        setExpiresAt(result.expiresAt);
        setStep("payment");
    } catch (error: any) {
        toast.error(error.data?.message || "Could not reserve spot");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCancelReservation = async () => {
    if(!bookingId) return;
    setIsProcessing(true);
    try {
        await cancelBooking({ bookingId });
        setBookingId(null);
        setExpiresAt(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setStep("details");
        toast.success("Reservation cancelled");
    } catch (error) {
        toast.error("Failed to cancel reservation");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!bookingId) return;
    if (!contactNumber.trim()) { toast.error("Please enter your contact number."); return; }
    if (paymentMethod === "transfer") {
        if (!selectedFile) { toast.error("Please upload proof of payment."); return; }
        if (!refundDetails.trim()) { toast.error("Please enter your refund details."); return; }
    }

    setIsProcessing(true);
    try {
        const postUrl = await generateUploadUrl();
        const uploadRes = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": selectedFile!.type },
            body: selectedFile,
        });
        if(!uploadRes.ok) throw new Error("Upload failed");
        const { storageId } = await uploadRes.json();

        await confirmBooking({
            bookingId,
            paymentMethod: "transfer",
            proofImageId: storageId,
            refundDetails,
            contactNumber,
        });

        toast.success("Booking submitted!");
        router.push("/my-bookings"); 
    } catch (error: any) {
        toast.error(error.data?.message || "Something went wrong");
        setIsProcessing(false);
    }
  };

  // --- 1. LOADING STATE ---
  if (!isLoaded) {
     return (
       <Card className="h-64 flex items-center justify-center border-slate-200 shadow-sm bg-slate-50">
          <Loader2 className="animate-spin text-slate-300 w-8 h-8" />
       </Card>
     );
  }

  // --- 2. GUEST VIEW (LOCKED) ---
  if (!isSignedIn) {
    return (
        <Card className="shadow-lg border-slate-200 sticky top-4 overflow-hidden">
           {/* Header is kept generic */}
           <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle>Tour Details</CardTitle>
              <CardDescription>{formatDate(startDate)}</CardDescription>
           </CardHeader>

           <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
              <div className="bg-slate-100 p-6 rounded-full ring-8 ring-slate-50">
                 <Lock className="w-8 h-8 text-slate-400" />
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-lg font-bold text-slate-900">Members Only Access</h3>
                 <p className="text-sm text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                    Sign in to view the <strong className="text-slate-700">price</strong>, <strong className="text-slate-700">available spots</strong>, and to book your ticket.
                 </p>
              </div>

              <Button 
                onClick={() => openSignIn({ afterSignInUrl: window.location.href, afterSignUpUrl: window.location.href })} 
                className="w-full max-w-[200px]"
                size="lg"
              >
                 Sign In / Register
              </Button>
           </CardContent>
        </Card>
    );
  }

  // --- 3. MEMBER VIEW (LOGGED IN) ---
  if (remaining <= 0 && step === "details") {
    return (
        <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center text-red-600 font-bold">Sold Out</CardContent>
        </Card>
    )
  }

  return (
    <Card className="shadow-lg border-slate-200 sticky top-4">
      <CardHeader className="bg-slate-50 border-b pb-4">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Book This Tour</CardTitle>
                <CardDescription>
                    {formatDate(startDate)}
                </CardDescription>
            </div>
            {step === "payment" && (
                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-mono font-bold border border-amber-200">
                    <Timer className="w-4 h-4" />
                    {timeLeft}
                </div>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {step === "details" && (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Number of Guests</Label>
                    <div className="flex items-center gap-4">
                        <Input 
                            type="number" min="1" max={remaining} 
                            value={ticketCount} 
                            onChange={(e) => setTicketCount(Number(e.target.value))} 
                            className="text-lg font-bold w-24"
                        />
                        <span className="text-sm text-slate-500">{remaining} spots remaining</span>
                    </div>
                </div>

                <div className="flex items-center justify-between text-lg font-bold pt-4 border-t">
                    <span>Total:</span>
                    <span>SAR {displayPrice.toFixed(2)}</span>
                </div>

                <div className="flex flex-col gap-3">
                    <Button 
                        onClick={handleReserve} 
                        disabled={isProcessing} 
                        className="w-full h-12 text-lg"
                    >
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : "Reserve Spot"}
                    </Button>
                    <Button variant="ghost" className="w-full text-slate-500" onClick={() => router.back()}>
                       <ArrowLeft className="w-4 h-4 mr-2" /> Return
                    </Button>
                </div>
            </div>
        )}

        {step === "payment" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-sm text-blue-900">
                    Reserved <strong>{ticketCount} tickets</strong>. Please complete payment within 15 minutes.
                 </div>

                 <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase text-slate-500">Contact Details</Label>
                    <div>
                        <Label className="text-xs mb-1 block">Phone Number <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <Input 
                                placeholder="+966..." 
                                className="pl-9"
                                value={contactNumber}
                                onChange={(e) => setContactNumber(e.target.value)}
                            />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-3 pt-2 border-t">
                    <Label className="text-xs font-bold uppercase text-slate-500">Payment Method</Label>
                    <div className="bg-slate-50 p-3 rounded-md border flex items-center gap-2 text-slate-700">
                        <Landmark className="w-4 h-4 text-green-600"/> 
                        <span className="font-medium text-sm">Bank Transfer / Manual Payment</span>
                    </div>
                </div>

                {paymentMethod === "transfer" && (
                    <div className="space-y-4 pt-2">
                        <div className="p-4 bg-amber-50 text-amber-900 rounded-lg border border-amber-100 text-sm">
                            <p className="font-bold flex items-center gap-2 mb-2"><Info className="w-4 h-4"/> Transfer Instructions:</p>
                            <div className="bg-white/60 p-2 rounded font-mono text-xs mb-2">
                                IBAN: SA00 0000 0000 0000 0000 0000<br/>
                                Amount: SAR {displayPrice.toFixed(2)}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Your Refund Details (IBAN, Name) <span className="text-red-500">*</span></Label>
                            <Textarea 
                                placeholder="Bank Name: ...&#10;Account Name: ...&#10;IBAN: SA..." 
                                value={refundDetails} 
                                onChange={(e) => setRefundDetails(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div 
                            className={`relative border-2 border-dashed p-4 rounded-xl text-center transition-colors cursor-pointer group 
                            ${selectedFile ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}
                            onClick={() => !selectedFile && fileInput.current?.click()}
                        >
                            <Input type="file" ref={fileInput} accept="image/*" className="hidden" onChange={handleFileSelect} />
                            {selectedFile ? (
                                <div className="flex items-center gap-3 text-left">
                                    {previewUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded object-cover bg-slate-200 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-green-800 truncate">{selectedFile.name}</p>
                                        <p className="text-xs text-green-600">Ready to upload</p>
                                    </div>
                                    <Button 
                                        variant="ghost" size="icon" 
                                        className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={handleRemoveFile}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="py-4">
                                    <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2 group-hover:text-slate-600 transition-colors"/>
                                    <p className="text-sm font-medium text-slate-600">Click to Upload Payment Proof</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 flex-col-reverse sm:flex-row">
                    <Button 
                        variant="outline" 
                        onClick={handleCancelReservation} 
                        disabled={isProcessing}
                        className="flex-1 h-12 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isProcessing} className="flex-1 h-12 text-lg">
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : "Confirm & Upload"}
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}