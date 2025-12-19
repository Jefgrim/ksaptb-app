"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const createTour = useMutation(api.tours.create);
  const [form, setForm] = useState({ title: "", description: "", price: 0, capacity: 10 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTour({
      title: form.title,
      description: form.description,
      price: Number(form.price) * 100,
      capacity: Number(form.capacity),
      startDate: Date.now(), // Simplified for demo
    });
    alert("Tour Created");
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Tour</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Tour Title" onChange={(e) => setForm({...form, title: e.target.value})} />
        <Input placeholder="Description" onChange={(e) => setForm({...form, description: e.target.value})} />
        <Input type="number" placeholder="Price (USD)" onChange={(e) => setForm({...form, price: +e.target.value})} />
        <Input type="number" placeholder="Capacity" onChange={(e) => setForm({...form, capacity: +e.target.value})} />
        <Button type="submit">Create Tour</Button>
      </form>
    </div>
  );
}