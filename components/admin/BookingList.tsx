"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Users, Eye, MoreHorizontal, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// IMPORT THE DIALOG
import { VerifyDialog } from "./VerifyDialog";

export function BookingList() {
  const bookings = useQuery(api.bookings.getAllBookings);
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  // --- REVIEW STATE ---
  const [reviewId, setReviewId] = useState<Id<"bookings"> | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // --- FILTER STATES ---
  const [searchRef, setSearchRef] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredBookings = bookings?.filter((b) => {
    const matchesRef = (b._id ?? "").toLowerCase().includes(searchRef.toLowerCase());
    const matchesName =
      (b.userName?.toLowerCase() ?? "").includes(searchName.toLowerCase()) ||
      (b.userEmail?.toLowerCase() ?? "").includes(searchName.toLowerCase());
    const matchesStatus = filterStatus === "all" ? true : b.status === filterStatus;

    return matchesRef && matchesName && matchesStatus;
  }) || [];

  const handleCancel = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure? This will release the tickets.")) return;
    try {
      await cancelBooking({ bookingId });
      toast.success("Booking cancelled");
    } catch (error) {
      toast.error("Failed to cancel");
    }
  };

  // Helper to open review modal
  const openReview = (id: Id<"bookings">) => {
    setReviewId(id);
    setIsReviewOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Master Booking List</CardTitle>
            <div className="text-sm text-gray-500">
              Showing {filteredBookings.length} results
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* --- FILTERS --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Ref ID"
              value={searchRef} onChange={(e) => setSearchRef(e.target.value)}
            />
            <Input
              placeholder="Customer Name/Email"
              value={searchName} onChange={(e) => setSearchName(e.target.value)}
            />
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="reviewing">Needs Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* --- TABLE --- */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {bookings === undefined ? "Loading..." : "No bookings found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {b._id.slice(-6)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{b.userName}</div>
                        <div className="text-xs text-gray-500">{b.userEmail}</div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm font-semibold">
                          SAR {(b.totalPrice / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{b.paymentStatus}</div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            b.status === "confirmed" ? "default" :
                              b.status === "cancelled" ? "destructive" :
                                b.paymentStatus === "reviewing" ? "outline" : "secondary"
                          }
                          className={b.paymentStatus === "reviewing" ? "bg-amber-100 text-amber-800 border-amber-200" : ""}
                        >
                          {b.paymentStatus === "reviewing" ? "Review Needed" : b.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">

                        {/* THE ACTION BUTTONS */}
                        <div className="flex justify-end gap-2">
                          {/* REVIEW BUTTON: Only show if payment needs review */}
                          {b.paymentStatus === "reviewing" && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 h-8 gap-1"
                              onClick={() => openReview(b._id)}
                            >
                              <Eye className="w-3 h-3" /> Review
                            </Button>
                          )}

                          {/* DROPDOWN FOR OTHER ACTIONS */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openReview(b._id)}>
                                View Details
                              </DropdownMenuItem>
                              {b.status === "confirmed" && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleCancel(b._id)}
                                >
                                  Cancel Booking
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- INTEGRATE THE DIALOG HERE --- */}
      <VerifyDialog
        bookingId={reviewId}
        open={isReviewOpen}
        onOpenChange={setIsReviewOpen}
      />
    </>
  );
}