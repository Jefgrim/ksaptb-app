import { Id } from "@/convex/_generated/dataModel";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { CalendarDays, MapPin, Users, Wallet, Clock, XCircle, CheckCircle2, QrCode, ArrowRight, AlertTriangle, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface BookingCardProps {
  booking: any;
  onCancel?: (id: Id<"bookings">) => void;
  isPast?: boolean;
}

export function BookingCard({ booking, onCancel, isPast = false }: BookingCardProps) {
  
  // --- STATUS CONFIGURATION ---
  const statusConfig = {
    holding: {
        label: "Payment Needed",
        color: "bg-amber-100 text-amber-800 border-amber-200",
        icon: AlertTriangle
    },
    pending: {
        label: "Verifying Payment",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Clock
    },
    reviewing: {
        label: "Verifying Payment",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Clock
    },
    confirmed: {
        label: "Confirmed",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle2
    },
    cancelled: {
        label: "Cancelled",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle
    },
    rejected: {
        label: "Payment Rejected",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle
    },
    expired: {
        label: "Expired",
        color: "bg-slate-100 text-slate-500 border-slate-200",
        icon: XCircle
    },
    completed: {
        label: "Completed",
        color: "bg-slate-100 text-slate-800 border-slate-200",
        icon: CheckCircle2
    }
  };

  const statusKey = (isPast ? "completed" : booking.status) as keyof typeof statusConfig;
  const status = statusConfig[statusKey] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Calculate Price
  const rawTotal = booking.totalPrice || (booking.tourPrice * booking.ticketCount);
  const totalPaid = rawTotal / 100;
  const refId = booking._id.slice(-8).toUpperCase(); // Short Ref ID

  return (
    <Card className="overflow-hidden border-slate-200 hover:shadow-md transition-all duration-200 group bg-white">
      <div className="flex flex-col md:flex-row">
        
        {/* --- LEFT: IMAGE --- */}
        <div className="relative w-full md:w-56 h-48 md:h-auto shrink-0 bg-slate-100">
          {booking.tour?.imageUrl ? (
            <Image 
              src={booking.tour.imageUrl} 
              alt={booking.tourTitle} 
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300">
              <MapPin className="w-10 h-10" />
            </div>
          )}
          
          {/* Mobile Status Badge Overlay */}
          <div className="absolute top-2 left-2 md:hidden">
            <Badge variant="outline" className={`whitespace-nowrap shadow-sm backdrop-blur-md ${status.color}`}>
               <StatusIcon className="w-3 h-3 mr-1"/>
               {status.label}
            </Badge>
          </div>
        </div>

        {/* --- RIGHT: CONTENT --- */}
        <div className="flex-1 flex flex-col p-5">
          
          {/* Header Row */}
          <div className="flex justify-between items-start gap-4 mb-3">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                 REF: {refId}
              </div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">{booking.tourTitle}</h3>
            </div>
            
            {/* Desktop Status Badge */}
            <div className="hidden md:block">
                <Badge variant="outline" className={`whitespace-nowrap ${status.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1"/>
                    {status.label}
                </Badge>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 py-4 border-t border-b border-dashed border-slate-200 my-1">
             
             {/* Date */}
             <div>
               <div className="flex items-center text-slate-400 text-xs uppercase font-bold mb-1">
                 <CalendarDays className="w-3 h-3 mr-1" /> Date
               </div>
               <div className="text-sm font-medium text-slate-700">
                 {formatDateTime(booking.tourDate)}
               </div>
             </div>

             {/* Guests */}
             <div>
               <div className="flex items-center text-slate-400 text-xs uppercase font-bold mb-1">
                 <Users className="w-3 h-3 mr-1" /> Guests
               </div>
               <div className="text-sm font-medium text-slate-700">
                 {booking.ticketCount} Person(s)
               </div>
             </div>

             {/* Price */}
             <div>
               <div className="flex items-center text-slate-400 text-xs uppercase font-bold mb-1">
                 <Wallet className="w-3 h-3 mr-1" /> Total Paid
               </div>
               <div className="text-sm font-bold text-emerald-700">
                 SAR {totalPaid.toFixed(2)}
               </div>
             </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
            
            {/* Left: Cancel Option */}
            <div>
                {onCancel && booking.status !== "cancelled" && booking.status !== "expired" && booking.status !== "completed" && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onCancel(booking._id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 -ml-2 h-8 text-xs"
                    >
                        Cancel Reservation
                    </Button>
                )}
            </div>

            {/* Right: Primary Actions */}
            <div className="flex gap-2 w-full md:w-auto">
                
                {/* CASE 1: HOLDING (Need to Pay) */}
                {booking.status === "holding" && (
                    <Link href={`/tours/${booking.tourId}`} className="w-full md:w-auto">
                        <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm shadow-amber-200">
                            Continue Payment <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                )}

                {/* CASE 2: CONFIRMED (Show Ticket) */}
                {booking.status === "confirmed" && (
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full md:w-auto border-slate-300 gap-2">
                                <QrCode className="w-4 h-4 text-slate-600" /> View Tickets
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-center">Your E-Tickets</DialogTitle>
                                <DialogDescription className="text-center">
                                    Please present these {booking.ticketCount} QR codes at the entrance.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-8 py-4">
                                {Array.from({ length: booking.ticketCount }).map((_, index) => {
                                    // Unique Data for this specific guest ticket
                                    const ticketNumber = index + 1;
                                    const uniqueQrData = `${booking._id}-${ticketNumber}`;
                                    
                                    return (
                                        <div key={index} className="flex flex-col items-center justify-center space-y-3 pb-8 border-b last:border-0 border-dashed border-slate-200">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                                                <Ticket className="w-4 h-4" />
                                                Guest #{ticketNumber}
                                            </div>

                                            <div className="bg-white p-4 rounded-xl border-2 border-slate-900 shadow-sm">
                                                {/* Uses a public API to generate scannable QR images instantly */}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${uniqueQrData}`}
                                                    alt={`Ticket ${ticketNumber}`}
                                                    className="w-40 h-40 mix-blend-multiply"
                                                />
                                            </div>
                                            
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-400 font-mono">
                                                    ID: {refId}-{ticketNumber}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </DialogContent>
                    </Dialog>
                )}

                {/* CASE 3: PENDING (Just a note) */}
                {(booking.status === "pending" || booking.status === "reviewing") && (
                     <Button disabled variant="secondary" className="w-full md:w-auto opacity-80 cursor-not-allowed">
                        <Clock className="w-4 h-4 mr-2" /> Awaiting Confirmation
                     </Button>
                )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}