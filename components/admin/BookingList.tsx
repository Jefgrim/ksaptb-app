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
import { Users } from "lucide-react"; // Optional icon

export function BookingList() {
  const bookings = useQuery(api.bookings.getAllBookings);
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  // --- FILTER STATES ---
  const [searchRef, setSearchRef] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchTour, setSearchTour] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // --- FILTER LOGIC ---
  const filteredBookings = bookings?.filter((b) => {
    // 1. Filter by Reference
    const matchesRef = (b._id ?? "").toLowerCase().includes(searchRef.toLowerCase());

    // 2. Filter by Name OR Email
    const matchesName = 
      (b.userName?.toLowerCase() ?? "").includes(searchName.toLowerCase()) ||
      (b.userEmail?.toLowerCase() ?? "").includes(searchName.toLowerCase());

    // 3. Filter by Tour Title
    const matchesTour = (b.tourTitle?.toLowerCase() ?? "").includes(searchTour.toLowerCase());

    // 4. Filter by Status
    const matchesStatus = filterStatus === "all" 
      ? true 
      : b.status === filterStatus;

    return matchesRef && matchesName && matchesTour && matchesStatus;
  }) || [];

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
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Master Booking List</CardTitle>
          <div className="text-sm text-gray-500">
            Showing {filteredBookings.length} results
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* --- FILTERS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input 
            placeholder="Ref ID (e.g. 5g92s1)" 
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
          />
          <Input 
            placeholder="Customer Name/Email" 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <Input 
            placeholder="Tour Title" 
            value={searchTour}
            onChange={(e) => setSearchTour(e.target.value)}
          />
          <select 
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>

        {/* --- TABLE --- */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[80px]">Guests</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {bookings === undefined ? "Loading..." : "No bookings found matching filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {b._id.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{b.userName ?? "Unknown User"}</div>
                      <div className="text-xs text-gray-500">{b.userEmail ?? "No Email"}</div>
                    </TableCell>
                    
                    {/* 👇 NEW GUESTS CELL */}
                    <TableCell>
                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">{b.ticketCount ?? 1}</span>
                        </div>
                    </TableCell>

                    <TableCell>{b.tourTitle ?? "Unknown Tour"}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {b.status === "confirmed" && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleCancel(b._id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}