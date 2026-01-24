'use client';

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Banknote,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import AdminGuard from '@/components/AdminGuard';

type ScanResult = {
  valid: boolean;
  message: string;
  booking?: any;
  alreadyRedeemed?: boolean;
  requiresSecondPayment?: boolean;
  remainingBalance?: number; // In CENTS
};

export default function AdminScannerPage() {
  return (
    <AdminGuard>
      <ScannerContent />
    </AdminGuard>
  );
}

function ScannerContent() {
  const validateTicket = useMutation(api.bookings.validateTicket);
  const confirmSecondPaymentMutation = useMutation(api.bookings.confirmSecondPayment);

  const [data, setData] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (rawCodes: any) => {
    const rawValue = Array.isArray(rawCodes) ? rawCodes[0]?.rawValue : rawCodes;
    if (!rawValue || (data && rawValue === data)) return;

    setData(rawValue);
    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      // Expect ONLY Booking ID in QR
      const bookingId = rawValue as Id<'bookings'>;

      if (!bookingId) throw new Error('Unreadable QR Data');

      // Validate
      const response = await validateTicket({ bookingId });
      setResult(response);

      if (response.valid) {
        toast.success('Access Granted!');
      } else if (response.requiresSecondPayment) {
        toast.warning('Payment Required!');
      } else {
        toast.error(response.message);
      }
    } catch (err) {
      console.error(err);
      setError('Invalid QR Code format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSecondPayment = async () => {
    if (!result?.booking?._id) return;

    setIsConfirming(true);
    try {
      await confirmSecondPaymentMutation({ bookingId: result.booking._id });
      toast.success('Payment Confirmed & Checked In!');

      // Manually update local state to "Valid"
      setResult({
        ...result,
        valid: true,
        requiresSecondPayment: false,
        message: "Access Granted"
      });
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.data?.message || 'Failed to confirm payment.');
    } finally {
      setIsConfirming(false);
    }
  };

  const resetScan = () => {
    setData(null);
    setResult(null);
    setError(null);
    setIsProcessing(false);
    setIsConfirming(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
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

      {!data && (
        <div className="w-full max-w-md aspect-square relative border-2 border-slate-700 rounded-2xl overflow-hidden bg-slate-900">
          <Scanner
            onScan={(codes) => handleScan(codes)}
            formats={['qr_code']}
            components={{ finder: true }}
          />
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
            <p className="bg-black/60 px-4 py-2 rounded-full text-sm font-medium">
              Point camera at QR Code
            </p>
          </div>
        </div>
      )}

      {isProcessing && (
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-white animate-pulse">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-lg">Verifying Booking...</p>
          </CardContent>
        </Card>
      )}

      {!isProcessing && (result || error) && (
        <Card
          className={`w-full max-w-md border-0 shadow-2xl ${
            result?.valid
              ? 'bg-green-600'
              : result?.requiresSecondPayment
              ? 'bg-blue-600' 
              : result?.alreadyRedeemed
              ? 'bg-amber-500'
              : 'bg-red-600'
          }`}
        >
          <CardHeader>
            <CardTitle className="flex flex-col items-center text-center text-white gap-2">
              {result?.valid ? (
                <>
                  <CheckCircle2 className="w-16 h-16" />
                  <span className="text-3xl font-black uppercase">
                    ACCESS GRANTED
                  </span>
                </>
              ) : result?.requiresSecondPayment ? (
                <>
                  <Banknote className="w-16 h-16" />
                  <span className="text-2xl font-black uppercase">
                    COLLECT PAYMENT
                  </span>
                </>
              ) : result?.alreadyRedeemed ? (
                <>
                  <AlertTriangle className="w-16 h-16" />
                  <span className="text-2xl font-black uppercase">
                    ALREADY USED
                  </span>
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
                
                {/* Guest Info */}
                <div className="text-center pb-4 border-b border-dashed border-slate-300">
                  <p className="text-sm text-slate-500 font-bold uppercase">
                    Guest Name
                  </p>
                  <p className="text-2xl font-bold">{result.booking.userName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Tour</p>
                    <p className="font-semibold leading-tight">{result.booking.tourTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Group Size</p>
                    <div className="flex items-center justify-end gap-1 font-mono font-semibold text-lg">
                      <Users className="w-4 h-4 text-slate-400" />
                      {result.booking.ticketCount}
                    </div>
                  </div>
                </div>

                {/* --- PAYMENT COLLECTION UI --- */}
                {result.requiresSecondPayment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-blue-800 font-bold">Balance Due:</span>
                        <span className="text-2xl font-bold text-blue-700">
                           {/* DIVIDE CENTS BY 100 */}
                           SAR {(result.remainingBalance ? result.remainingBalance / 100 : 0).toFixed(2)}
                        </span>
                     </div>
                     <p className="text-xs text-blue-600 mb-4">
                        Collect cash/transfer, then confirm below to check-in.
                     </p>
                     
                     <Button 
                       onClick={handleConfirmSecondPayment}
                       disabled={isConfirming}
                       className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold"
                     >
                       {isConfirming ? (
                         <Loader2 className="w-5 h-5 animate-spin mr-2" />
                       ) : (
                         'Confirm Payment & Check-in'
                       )}
                     </Button>
                  </div>
                )}

                {!result.valid && !result.requiresSecondPayment && (
                  <div className="p-3 mt-4 rounded-lg text-center font-bold text-sm bg-red-100 text-red-600">
                    {result.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-lg font-bold text-red-600">
                  {error || result?.message}
                </p>
              </div>
            )}

            <Button
              onClick={resetScan}
              className="w-full mt-6 h-12 text-lg gap-2 shadow-lg"
              size="lg"
              disabled={isConfirming}
            >
              <RotateCcw className="w-5 h-5" /> Scan Next Ticket
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}