"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export function BookingList() {
  const bookings = useQuery(api.bookings.getAllBookings);
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  const handleCancel = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure?")) return;
    try {
      await cancelBooking({ bookingId });
      toast.success("Booking cancelled");
    } catch (error) {
      toast.error("Failed to cancel");
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Master Booking List</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Tour</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings?.map((b) => (
              <TableRow key={b._id}>
                <TableCell>
                  <div className="font-medium">{b.userName}</div>
                  <div className="text-xs text-gray-500">{b.userEmail}</div>
                </TableCell>
                <TableCell>{b.tourTitle}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge>
                </TableCell>
                <TableCell>
                  {b.status === "confirmed" && (
                    <Button variant="destructive" size="sm" onClick={() => handleCancel(b._id)}>Cancel</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}