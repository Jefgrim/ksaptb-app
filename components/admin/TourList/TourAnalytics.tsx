"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";

export function TourAnalytics({ tour }: { tour: Doc<"tours"> }) {
  // Safe access for analytics data in case it's undefined
  // @ts-ignore - 'analytics' might not exist on the type yet if schema isn't fully updated in IDE
  const { totalRevenue, uniqueParticipants } = tour.analytics || { totalRevenue: 0, uniqueParticipants: 0 };
  
  const occupancy = tour.capacity > 0 ? Math.round((tour.bookedCount / tour.capacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Revenue</p>
            <p className="text-xl md:text-2xl font-bold text-green-700">SAR {(totalRevenue / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Bookings</p>
            <p className="text-xl md:text-2xl font-bold text-slate-700">{uniqueParticipants}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Occupancy</p>
            <p className="text-xl md:text-2xl font-bold text-blue-700">{occupancy}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-100 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-slate-900">Completion Status</h4>
          <p className="text-sm text-slate-600 mt-1">
            This tour occurred on <span className="font-semibold">{new Date(tour.startDate).toLocaleDateString()}</span>.
            It is now closed for modifications.
          </p>
        </div>
      </div>
    </div>
  );
}