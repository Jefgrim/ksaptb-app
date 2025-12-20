"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, CreditCard, Landmark, Upload, Info, Timer } from "lucide-react";
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
  
  // --- CONVEX HOOKS ---
  const reserveBooking = useMutation(api.bookings.reserve);
  const confirmBooking = useMutation(api.bookings.confirm);
  const generateUploadUrl = useMutation(api.tours.generateUploadUrl);
  const createStripeSession = useAction(api.stripe.createCheckoutSession);
  
  // Resume Logic
  const activeHolding = useQuery(api.bookings.getMyActiveHolding, { tourId });

  // --- STATE ---
  const [step, setStep] = useState<"details" | "payment">("details");
  const [ticketCount, setTicketCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "transfer">(ENABLE_STRIPE ? "stripe" : "transfer");
  const [refundDetails, setRefundDetails] = useState("");
  
  const [bookingId, setBookingId] = useState<Id<"bookings"> | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const remaining = capacity - bookedCount;
  const displayPrice = (price * (step === "payment" && activeHolding ? activeHolding.ticketCount : ticketCount)) / 100;

  // --- EFFECT: RESTORE SESSION ---
  useEffect(() => {
    if (activeHolding) {
        setBookingId(activeHolding._id);
        setExpiresAt(activeHolding.expiresAt || null);
        setTicketCount(activeHolding.ticketCount);
        setStep("payment");
    }
  }, [activeHolding]);

  // --- EFFECT: TIMER ---
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

  const handleConfirm = async () => {
    if (!bookingId) return;

    if (paymentMethod === "transfer") {
        if (!fileInput.current?.files?.[0]) {
            toast.error("Please select an image file.");
            return;
        }
        if (!refundDetails) {
            toast.error("Please enter refund details.");
            return;
        }
    }

    setIsProcessing(true);

    try {
        if (paymentMethod === "stripe") {
            const url = await createStripeSession({
                bookingId,
                title: "Tour Booking",
                priceInCents: price,
                count: ticketCount
            });
            if(url) window.location.href = url;
            return;
        }

        // Upload Proof
        const file = fileInput.current!.files![0];
        const postUrl = await generateUploadUrl();
        const uploadRes = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
        });
        if(!uploadRes.ok) throw new Error("Upload failed");
        const { storageId } = await uploadRes.json();

        // Confirm
        await confirmBooking({
            bookingId,
            paymentMethod: "transfer",
            proofImageId: storageId,
            refundDetails
        });

        toast.success("Proof submitted successfully!");
        
        // --- FIXED REDIRECT HERE ---
        router.push("/my-bookings"); 

    } catch (error: any) {
        console.error(error);
        toast.error(error.data?.message || "Something went wrong");
        setIsProcessing(false);
    }
  };

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
                    {/* Using the KSA Date Helper */}
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

                <Button onClick={handleReserve} disabled={isProcessing} className="w-full h-12 text-lg">
                    {isProcessing ? <Loader2 className="animate-spin mr-2"/> : "Reserve Spot"}
                </Button>
            </div>
        )}

        {step === "payment" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                 
                 <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-sm text-blue-900">
                    You have reserved <strong>{ticketCount} tickets</strong>. Please complete payment within 15 minutes.
                 </div>

                 <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-slate-500">Payment Method</Label>
                    {ENABLE_STRIPE ? (
                        <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                            <div className="flex items-center space-x-2 border p-3 rounded-lg">
                                <RadioGroupItem value="stripe" id="stripe" />
                                <Label htmlFor="stripe" className="flex items-center gap-2"><CreditCard className="w-4 h-4"/> Credit Card</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-lg">
                                <RadioGroupItem value="transfer" id="transfer" />
                                <Label htmlFor="transfer" className="flex items-center gap-2"><Landmark className="w-4 h-4"/> Bank Transfer</Label>
                            </div>
                        </RadioGroup>
                    ) : (
                        <div className="bg-slate-50 p-3 rounded-md border flex items-center gap-2 text-slate-700">
                             <Landmark className="w-4 h-4 text-green-600"/> 
                             <span className="font-medium text-sm">Bank Transfer / Manual Payment</span>
                        </div>
                    )}
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
                            <Label className="text-xs font-bold">Your Refund IBAN <span className="text-red-500">*</span></Label>
                            <Input placeholder="SA..." value={refundDetails} onChange={(e) => setRefundDetails(e.target.value)}/>
                        </div>

                        <div 
                            className="border-2 border-dashed border-slate-300 p-6 rounded-xl text-center hover:bg-slate-50 cursor-pointer"
                            onClick={() => fileInput.current?.click()}
                        >
                            <Input type="file" ref={fileInput} accept="image/*" className="hidden" />
                            <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2"/>
                            <p className="text-sm font-medium text-slate-600">Upload Receipt Screenshot</p>
                        </div>
                    </div>
                )}

                <Button onClick={handleConfirm} disabled={isProcessing} className="w-full h-12 text-lg">
                    {isProcessing ? <Loader2 className="animate-spin mr-2"/> : (paymentMethod === "stripe" ? "Pay Now" : "Confirm Payment")}
                </Button>
            </div>
        )}

      </CardContent>
    </Card>
  );
}