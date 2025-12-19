"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Ensure you have this
import { Button } from "@/components/ui/button"; // Ensure you have this
import { useState } from "react";

export default function AdminDashboard() {
  const router = useRouter();
  const bookings = useQuery(api.bookings.getAllBookings);
  const createTour = useMutation(api.tours.create);

  // 1. Fetch User
  const user = useQuery(api.users.current);

  // 2. Effect: Redirect immediately if loaded and not admin
  useEffect(() => {
    if (user !== undefined) { // undefined means "still loading"
      if (!user || user.role !== "admin") {
        router.push("/"); // Kick them out to homepage
      }
    }
  }, [user, router]);

  // 3. While checking, show a loader (prevents flashing the admin content)
  if (user === undefined || (user && user.role !== "admin")) {
    return <div className="p-10 text-center">Verifying permissions...</div>;
  }

  // Simple form state
  const [form, setForm] = useState({ title: "", description: "", price: 0, capacity: 10 });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTour({ ...form, price: Number(form.price) * 100, capacity: Number(form.capacity), startDate: Date.now() });
    alert("Tour Created");
  };

  return (
    <div className="container mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="bookings">All Bookings</TabsTrigger>
          <TabsTrigger value="create">Create Tour</TabsTrigger>
        </TabsList>

        {/* VIEW BOOKINGS TAB */}
        <TabsContent value="bookings">
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
                        <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* Admin can also cancel on behalf of users */}
                        <Button variant="ghost" size="sm">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREATE TOUR TAB */}
        <TabsContent value="create">
          <Card className="max-w-xl">
            <CardHeader><CardTitle>Add New Package</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-2">
                  <label>Title</label>
                  <Input onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <label>Description</label>
                  <Input onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Price (USD)</label>
                    <Input type="number" onChange={(e) => setForm({ ...form, price: +e.target.value })} required />
                  </div>
                  <div>
                    <label>Capacity</label>
                    <Input type="number" onChange={(e) => setForm({ ...form, capacity: +e.target.value })} required />
                  </div>
                </div>
                <Button type="submit">Publish Tour</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}