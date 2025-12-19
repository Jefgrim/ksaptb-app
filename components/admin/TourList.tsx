"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export function TourList() {
  const tours = useQuery(api.tours.list);
  const deleteTour = useMutation(api.tours.deleteTour);

  const handleDelete = async (id: Id<"tours">) => {
    if (!confirm("Delete this tour permanently?")) return;
    try {
      await deleteTour({ id });
      toast.success("Tour deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Current Tour Packages</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours?.map((tour) => (
              <TableRow key={tour._id}>
                <TableCell>
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                    {tour.imageUrl && <img src={tour.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{tour.title}</TableCell>
                <TableCell>${(tour.price / 100).toFixed(2)}</TableCell>
                <TableCell>{tour.bookedCount} / {tour.capacity}</TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(tour._id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}