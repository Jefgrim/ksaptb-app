"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Define the shape of the verification result
type ScanResult = {
    valid: boolean;
    message: string;
    booking?: any;
    alreadyRedeemed?: boolean;
};

export default function AdminScanner() {

    const router = useRouter();
    const { isLoaded, isSignedIn } = useUser();
    const user = useQuery(api.users.current);

    // Security Redirect
    useEffect(() => {
        if (isLoaded) {
            if (!isSignedIn || (user !== undefined && user?.role !== "admin")) {
                router.replace("/");
            }
        }
    }, [isLoaded, isSignedIn, user, router]);

    if (!isLoaded || user === undefined) return <div className="p-10 text-center">Verifying admin privileges...</div>;
    if (user?.role !== "admin") return null;

    const validateTicket = useMutation(api.bookings.validateTicket);

    const [data, setData] = useState<string | null>(null);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async (rawCodes: any) => {
        // 1. Prevent multiple scans while processing
        if (data || isProcessing) return;

        // The library returns an array of detected codes, we take the first one
        const rawValue = rawCodes?.[0]?.rawValue;
        if (!rawValue) return;

        setData(rawValue);
        setIsProcessing(true);

        try {
            // 2. Parse the QR Data (Format: BOOKING_ID-TICKET_NUMBER)
            // We split by the last hyphen to separate ID from Ticket #
            const lastIndex = rawValue.lastIndexOf("-");
            if (lastIndex === -1) throw new Error("Invalid QR Format");

            const bookingId = rawValue.substring(0, lastIndex) as Id<"bookings">;
            const ticketNumber = parseInt(rawValue.substring(lastIndex + 1));

            if (!bookingId || isNaN(ticketNumber)) throw new Error("Unreadable QR Data");

            // 3. Call Backend to Validate
            const response = await validateTicket({ bookingId, ticketNumber });
            setResult(response);

            if (response.valid) {
                toast.success("Ticket Verified!");
                // Optional: Play a success sound here
            } else {
                toast.error(response.message);
                // Optional: Play an error sound here
            }

        } catch (err) {
            console.error(err);
            setError("Invalid QR Code. Not a system ticket.");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetScan = () => {
        setData(null);
        setResult(null);
        setError(null);
        setIsProcessing(false);
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">

            {/* Header */}
            <div className="w-full max-w-md flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    Ticket Scanner
                </h1>
                <Link href="/admin">
                    <Button variant="secondary" size="sm" className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Exit
                    </Button>
                </Link>
            </div>

            {/* --- STATE 1: CAMERA VIEW --- */}
            {!data && (
                <div className="w-full max-w-md aspect-square relative border-2 border-slate-700 rounded-2xl overflow-hidden bg-slate-900">
                    <Scanner
                        onScan={handleScan}
                        formats={['qr_code']}
                        components={{
                            finder: true, // Shows the little scanning box
                        }}
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                        <p className="bg-black/60 px-4 py-2 rounded-full text-sm font-medium">
                            Point camera at QR Code
                        </p>
                    </div>
                </div>
            )}

            {/* --- STATE 2: PROCESSING --- */}
            {isProcessing && (
                <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-white animate-pulse">
                    <CardContent className="flex flex-col items-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                        <p className="text-lg">Verifying Ticket...</p>
                    </CardContent>
                </Card>
            )}

            {/* --- STATE 3: RESULT --- */}
            {!isProcessing && (result || error) && (
                <Card className={`w-full max-w-md border-0 shadow-2xl ${result?.valid ? "bg-green-600" :
                        result?.alreadyRedeemed ? "bg-amber-500" :
                            "bg-red-600"
                    }`}>
                    <CardHeader>
                        <CardTitle className="flex flex-col items-center text-center text-white gap-2">
                            {result?.valid ? (
                                <>
                                    <CheckCircle2 className="w-16 h-16" />
                                    <span className="text-3xl font-black uppercase">ACCESS GRANTED</span>
                                </>
                            ) : result?.alreadyRedeemed ? (
                                <>
                                    <AlertTriangle className="w-16 h-16" />
                                    <span className="text-2xl font-black uppercase">ALREADY USED</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-16 h-16" />
                                    <span className="text-3xl font-black uppercase">INVALID</span>
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="bg-white/95 backdrop-blur rounded-b-xl p-6 text-slate-900">

                        {result?.booking ? (
                            <div className="space-y-4">
                                <div className="text-center pb-4 border-b border-dashed border-slate-300">
                                    <p className="text-sm text-slate-500 font-bold uppercase">Guest Name</p>
                                    <p className="text-2xl font-bold">{result.booking.userName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Tour</p>
                                        <p className="font-semibold leading-tight">{result.booking.tourTitle}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 font-bold uppercase">Ticket</p>
                                        <p className="font-mono font-semibold">
                                            {result.booking.redeemedTickets?.length || 0} / {result.booking.ticketCount} Used
                                        </p>
                                    </div>
                                </div>

                                {!result.valid && (
                                    <div className="bg-slate-100 p-3 rounded-lg text-center text-red-600 font-bold text-sm">
                                        {result.message}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-lg font-bold text-red-600">{error || result?.message}</p>
                            </div>
                        )}

                        <Button onClick={resetScan} className="w-full mt-6 h-12 text-lg gap-2 shadow-lg" size="lg">
                            <RotateCcw className="w-5 h-5" /> Scan Next Ticket
                        </Button>

                    </CardContent>
                </Card>
            )}

        </div>
    );
}