'use client'

import { DetailedReport } from "@/components/admin/DetailedReport";

export default function AdminReportPage() {

  return (
    <div className="container mx-auto p-4 md:p-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8">Financial Report</h1>
        <DetailedReport />
    </div>
  );
}
