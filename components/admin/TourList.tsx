"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export function TourList() {
  const tours = useQuery(api.tours.list);
  const deleteTour = useMutation(api.tours.deleteTour);
  const updateTour = useMutation(api.tours.update);

  // State for the tour currently being edited
  const [editingId, setEditingId] = useState<Id<"tours"> | null>(null);
  
  // Temporary form state for the edit modal
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: 0,
    capacity: 0,
    date: "",
  });

  const handleDelete = async (id: Id<"tours">) => {
    if (!confirm("Delete this tour permanently?")) return;
    try {
      await deleteTour({ id });
      toast.success("Tour deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  // Open the modal and load data
  const openEdit = (tour: any) => {
    setEditingId(tour._id);
    setEditForm({
      title: tour.title,
      description: tour.description,
      price: tour.price / 100, // Convert cents to dollars
      capacity: tour.capacity,
      // Convert timestamp back to YYYY-MM-DD for input
      date: new Date(tour.startDate).toISOString().split('T')[0],
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      await updateTour({
        id: editingId,
        title: editForm.title,
        description: editForm.description,
        price: Number(editForm.price) * 100, // Convert back to cents
        capacity: Number(editForm.capacity),
        startDate: new Date(editForm.date).getTime(),
      });
      toast.success("Tour updated successfully!");
      setEditingId(null); // Close modal
    } catch (error) {
      console.error(error);
      toast.error("Failed to update tour");
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
                <TableCell className="text-right space-x-2">
                  
                  {/* EDIT BUTTON opens Dialog */}
                  <Dialog open={editingId === tour._id} onOpenChange={(open) => !open && setEditingId(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => openEdit(tour)}>
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Tour</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdate} className="space-y-4 mt-4">
                        <div className="grid gap-2">
                          <Label>Title</Label>
                          <Input 
                            value={editForm.title} 
                            onChange={(e) => setEditForm({...editForm, title: e.target.value})} 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Price ($)</Label>
                            <Input 
                              type="number" 
                              value={editForm.price} 
                              onChange={(e) => setEditForm({...editForm, price: +e.target.value})} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Capacity</Label>
                            <Input 
                              type="number" 
                              value={editForm.capacity} 
                              onChange={(e) => setEditForm({...editForm, capacity: +e.target.value})} 
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Date</Label>
                          <Input 
                            type="date" 
                            value={editForm.date} 
                            onChange={(e) => setEditForm({...editForm, date: e.target.value})} 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Input 
                            value={editForm.description} 
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})} 
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button type="submit">Save Changes</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* DELETE BUTTON */}
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(tour._id)}>
                    Delete
                  </Button>

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}