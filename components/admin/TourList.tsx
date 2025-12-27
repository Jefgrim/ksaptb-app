"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  Image as ImageIcon, Trash2, Edit, AlertCircle, RefreshCw, 
  CheckCircle2, AlertTriangle, BarChart3, History 
} from "lucide-react";

// Import Components
import { TourAnalytics } from "./TourList/TourAnalytics";
import { RefundManager } from "./TourList/RefundManager";
import { TourEditDialog } from "./TourList/TourEditDialog";

export function TourList() {
  const tours = useQuery(api.tours.list);
  const deleteTour = useMutation(api.tours.deleteTour);
  const cancelTour = useMutation(api.tours.cancelTour);

  // State
  const [editingTour, setEditingTour] = useState<Doc<"tours"> | null>(null);
  const [refundDialogId, setRefundDialogId] = useState<Id<"tours"> | null>(null);
  const [analyticsId, setAnalyticsId] = useState<Id<"tours"> | null>(null);

  const handleCancelTour = async (tour: any) => {
    if (tour.hasPendingBookings) {
      toast.error("Cannot cancel tour with PENDING bookings. Please Accept or Reject them first.");
      return;
    }
    if (!confirm("Are you sure you want to CANCEL this tour? This will stop new bookings and require you to refund existing customers.")) return;

    try {
      await cancelTour({ id: tour._id });
      toast.success("Tour cancelled. Please check refund status.");
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to cancel tour");
    }
  };

  const handleDelete = async (id: Id<"tours">) => {
    if (!confirm("Delete this tour?")) return;
    try {
      await deleteTour({ id });
      toast.success("Tour deleted");
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to delete tour");
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle>Current Tour Packages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours?.map((tour: any) => {
                 const isCompleted = tour.isCompleted;
                 const isCancelled = tour.cancelled;
                 
                 // Row Style
                 let rowClass = "";
                 if (isCancelled) rowClass = "bg-red-50";
                 else if (isCompleted) rowClass = "bg-slate-50/70";

                 return (
                    <TableRow key={tour._id} className={rowClass}>
                    <TableCell>
                        {tour.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={tour.imageUrl} alt={tour.title} className={`w-12 h-12 object-cover rounded-md ${isCompleted ? "grayscale opacity-80" : ""}`} />
                        ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center">
                            <ImageIcon className="text-slate-300 w-6 h-6" />
                        </div>
                        )}
                    </TableCell>
                    <TableCell className="font-medium">
                        <div>
                        <div className="flex items-center gap-2">
                            <p className={isCompleted ? "text-slate-600" : "text-slate-900"}>{tour.title}</p>
                            {isCompleted && <History className="w-3 h-3 text-slate-400" />}
                        </div>
                        <p className="text-xs text-slate-500">{new Date(tour.startDate).toLocaleDateString()}</p>
                        </div>
                    </TableCell>
                    <TableCell>SAR {tour.price / 100}</TableCell>
                    <TableCell>
                        {isCancelled ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Cancelled</span>
                        ) : isCompleted ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        {isCompleted ? (
                             <Dialog open={analyticsId === tour._id} onOpenChange={(open) => !open && setAnalyticsId(null)}>
                                <DialogTrigger asChild>
                                   <Button variant="outline" size="sm" onClick={() => setAnalyticsId(tour._id)}>
                                      <BarChart3 className="w-4 h-4 mr-2" /> Details
                                   </Button>
                                </DialogTrigger>
                                <DialogContent>
                                   <DialogHeader><DialogTitle>Tour Summary: {tour.title}</DialogTitle></DialogHeader>
                                   <TourAnalytics tour={tour} />
                                </DialogContent>
                             </Dialog>
                        ) : (
                            <>
                                {tour.cancelled ? (
                                    <Dialog open={refundDialogId === tour._id} onOpenChange={(open) => !open && setRefundDialogId(null)}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setRefundDialogId(tour._id)}>
                                        <RefreshCw className="w-4 h-4 mr-2" /> Manage Refunds
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                                        <DialogHeader><DialogTitle>Refund Manager - {tour.title}</DialogTitle></DialogHeader>
                                        <RefundManager tourId={tour._id} />
                                    </DialogContent>
                                    </Dialog>
                                ) : (
                                    <>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingTour(tour)}><Edit className="h-4 w-4" /></Button>

                                    {tour.hasPendingBookings ? (
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span tabIndex={0} className="inline-block cursor-not-allowed">
                                            <Button disabled variant="ghost" size="icon" className="h-8 w-8 text-slate-300"><AlertTriangle className="h-4 w-4" /></Button>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Resolve Pending bookings first</p></TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleCancelTour(tour)}>
                                        <AlertCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                    </>
                                )}
                                {tour.bookedCount === 0 && !tour.cancelled && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(tour._id)}><Trash2 className="h-4 w-4" /></Button>
                                )}
                            </>
                        )}
                        </div>
                    </TableCell>
                    </TableRow>
                 )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Component with explicit key to reset state when tour changes */}
      {editingTour && (
        <TourEditDialog 
          key={editingTour._id} 
          tour={editingTour} 
          isOpen={!!editingTour} 
          onClose={() => setEditingTour(null)} 
        />
      )}
    </TooltipProvider>
  );
}