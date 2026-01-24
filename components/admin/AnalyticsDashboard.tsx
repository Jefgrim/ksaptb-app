'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';

// Helper to get month names
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function AnalyticsDashboard() {
  // --- STATE MANAGEMENT ---
  // Get current KSA month and year
  const ksaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const [year, setYear] = useState(ksaDate.getFullYear());
  const [month, setMonth] = useState(ksaDate.getMonth() + 1); // 1-indexed
  const [filter, setFilter] = useState({ year, month });

  // --- DATA FETCHING ---
  // useQuery will automatically refetch when `filter` state changes
  const data = useQuery(api.analytics.getAnalytics, {
    year: filter.year,
    month: filter.month,
  });

  // --- EVENT HANDLERS ---
  const handleFilter = () => {
    setFilter({ year, month });
  };

  const handleClearFilter = () => {
    // Reset state to current KSA month/year
    const currentKsaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    const currentYear = currentKsaDate.getFullYear();
    const currentMonth = currentKsaDate.getMonth() + 1;
    setYear(currentYear);
    setMonth(currentMonth);
    setFilter({ year: currentYear, month: currentMonth });
  };

  // --- RENDER LOGIC ---
  const totalTours = data?.totalTours ?? 0;
  const totalBookings = data?.totalBookings ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;

  return (
    <div>
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-slate-50 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mr-2">Filters</h2>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, index) => (
              <SelectItem key={name} value={String(index + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px] bg-white">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleFilter}>Apply Filter</Button>
        <Button variant="outline" onClick={handleClearFilter}>Clear Filter</Button>
      </div>

      {/* Data Loading Skeleton */}
      {data === undefined ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => (
              <Card key={i}>
                  <CardHeader><CardTitle className='h-6 w-24 bg-gray-200 rounded animate-pulse'></CardTitle></CardHeader>
                  <CardContent><div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div></CardContent>
              </Card>
          ))}
        </div>
      ) : (
        /* Main Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Tours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTours}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">SAR {(totalRevenue / 100).toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
