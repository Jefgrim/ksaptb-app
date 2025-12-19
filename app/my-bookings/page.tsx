"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";

export default function MyBookings() {
    const data = useQuery(api.bookings.getMyBookings);
    const cancel = useMutation(api.bookings.cancelBooking);

    if (!data) return <div className="p-10 text-center">Loading bookings...</div>;

    return (
        <div className="container mx-auto p-10">
            <h1 className="text-3xl font-bold mb-8">My Trips</h1>

            {data.length === 0 ? (
                <div className="text-gray-500">You haven't booked any tours yet.</div>
            ) : (
                <div className="space-y-4">
                    {data.map(({ tour, ...booking }) => (
                        <Card key={booking._id} className="flex flex-col md:flex-row items-center justify-between p-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-lg">{tour?.title}</h3>
                                    <Badge variant={booking.status === "confirmed" ? "default" : "destructive"}>
                                        {booking.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Date: {tour ? new Date(tour.startDate).toLocaleDateString() : "N/A"}
                                </p>
                                <p className="text-xs text-gray-400">Booking ID: {booking._id}</p>
                            </div>

                            {/* We will add the Cancel button here in the next section */}
                            {booking.status === "confirmed" && (
                                <Button
                                    variant="outline"
                                    className="mt-4 md:mt-0 text-red-500 border-red-200 hover:bg-red-50"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to cancel?")) {
                                            cancel({ bookingId: booking._id });
                                        }
                                    }}
                                >
                                    Cancel Booking
                                </Button>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}