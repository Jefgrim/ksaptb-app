import { Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CalendarDays, MapPin, Users, Wallet, Clock, XCircle, 
  CheckCircle2, QrCode, ArrowRight, AlertTriangle, RefreshCcw 
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface BookingCardProps {
  booking: any;
  onCancel?: (id: Id<"bookings">) => void;
  isPast?: boolean;
}

export function BookingCard({ booking, onCancel, isPast = false }: BookingCardProps) {
  
  // STATUS CONFIGURATION
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    holding:   { label: "Payment Needed", color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle },
    pending:   { label: "Verifying",      color: "bg-blue-100 text-blue-800 border-blue-200",   icon: Clock },
    // "reviewing" map added for safety, even if not in TS type
    reviewing: { label: "Verifying",      color: "bg-blue-100 text-blue-800 border-blue-200",   icon: Clock },
    confirmed: { label: "Confirmed",      color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    completed: { label: "Completed",      color: "bg-slate-100 text-slate-800 border-slate-200", icon: CheckCircle2 },
    cancelled: { label: "Cancelled",      color: "bg-red-50 text-red-600 border-red-100",       icon: XCircle },
    rejected:  { label: "Rejected",       color: "bg-red-50 text-red-600 border-red-100",       icon: XCircle },
    expired:   { label: "Expired",        color: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle },
    refunded:  { label: "Refunded",       color: "bg-purple-50 text-purple-700 border-purple-200", icon: RefreshCcw },
  };

  // Determine which status key to use
  let statusKey = booking.status;
  if (isPast) statusKey = "completed";
  
  const status = statusConfig[statusKey] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Formatting
  const rawTotal = booking.totalPrice || (booking.tourPrice * booking.ticketCount);
  const totalPaid = rawTotal / 100; // Assuming price is in cents
  const refId = booking._id.slice(-6).toUpperCase();
  const isRefunded = booking.status === "refunded";

  return (
    <Card className="group overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col md:flex-row">
        
        {/* --- LEFT: IMAGE SECTION --- */}
        <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 bg-slate-100 overflow-hidden">
           {booking.tour?.imageUrl ? (
            <Image 
              src={booking.tour.imageUrl} 
              alt={booking.tourTitle || "Tour"} 
              fill
              className={`object-cover transition-transform duration-700 group-hover:scale-105 ${isRefunded || booking.status === 'cancelled' ? 'grayscale opacity-70' : ''}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300">
              <MapPin className="w-10 h-10 opacity-20" />
            </div>
          )}
          
          {/* Mobile Badge Overlay */}
          <div className="absolute top-3 left-3 md:hidden">
            <Badge variant="outline" className={`backdrop-blur-md shadow-sm ${status.color}`}>
               <StatusIcon className="w-3 h-3 mr-1.5"/>
               {status.label}
            </Badge>
          </div>
        </div>

        {/* --- RIGHT: CONTENT SECTION --- */}
        <div className="flex-1 flex flex-col p-5 md:p-6">
          
          {/* Header: Title & Desktop Badge */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                   REF: {refId}
                 </span>
              </div>
              <h3 className="font-bold text-xl text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                {booking.tourTitle}
              </h3>
            </div>
            
            <div className="hidden md:block">
                <Badge variant="outline" className={`px-3 py-1 ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5 mr-1.5"/>
                    {status.label}
                </Badge>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 py-4 border-t border-slate-100 mt-auto">
             
             {/* Date */}
             <div>
               <div className="flex items-center text-slate-400 text-xs uppercase font-bold mb-1.5">
                 <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Date
               </div>
               <div className="text-sm font-semibold text-slate-700">
                 {booking.tourDate ? formatDateTime(booking.tourDate) : "TBD"}
               </div>
             </div>

             {/* Guests */}
             <div>
               <div className="flex items-center text-slate-400 text-xs uppercase font-bold mb-1.5">
                 <Users className="w-3.5 h-3.5 mr-1.5" /> Guests
               </div>
               <div className="text-sm font-semibold text-slate-700">
                 {booking.ticketCount} Person(s)
               </div>
             </div>

             {/* Price */}
             <div>
               <div className="flex items-center text-slate-400 text-xs uppercase font-bold mb-1.5">
                 <Wallet className="w-3.5 h-3.5 mr-1.5" /> 
                 {isRefunded ? "Refunded Amount" : "Total Paid"}
               </div>
               <div className={`text-sm font-bold ${isRefunded ? 'text-purple-600 line-through decoration-slate-300' : 'text-emerald-600'}`}>
                 SAR {totalPaid.toFixed(2)}
               </div>
             </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            
            {/* Cancel Button (Hidden for certain states) */}
            <div>
                {onCancel && 
                 !['cancelled', 'expired', 'rejected', 'refunded', 'completed'].includes(booking.status) && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onCancel(booking._id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 -ml-2 h-9 text-xs font-medium"
                    >
                        Cancel Reservation
                    </Button>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
                
                {booking.status === "holding" && (
                    <Link href={`/tours/${booking.tourId}`} className="w-full md:w-auto">
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200">
                            Continue Payment <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                )}

                {booking.status === "confirmed" && (
                      <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full md:w-auto border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700">
                                <QrCode className="w-4 h-4 mr-2" /> View Ticket
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <div className="p-8 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Access Your Ticket</h3>
                                <p className="text-slate-500 text-sm">Scan this code at the venue entrance.</p>
                                <div className="border-2 border-dashed border-slate-200 p-8 rounded-lg bg-slate-50 mx-auto w-48 h-48 flex items-center justify-center">
                                    <QrCode className="w-16 h-16 text-slate-300" />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {(booking.status === "pending" || booking.status === "reviewing") && (
                   <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> Awaiting Admin Confirmation
                   </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}