'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import Link from "next/link";
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Ticket, Wallet, FilterX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// A simple CSV converter
function convertToCSV(data: any[]) {
    if (!data || data.length === 0) {
        return "";
    }
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

// The component to display the report
export function DetailedReport() {
    const [year, setYear] = useState<number | undefined>();
    const [month, setMonth] = useState<number | undefined>();
    const [tourId, setTourId] = useState<string | undefined>();

    const reportResult = useQuery(api.analytics.getDetailedBookingsReport, {
        year,
        month,
        tourId,
    });
    const allTours = useQuery(api.tours.list);
    
    const reportData = reportResult?.report;
    const totalRevenue = reportResult?.totalRevenue;
    const totalTickets = reportResult?.totalTickets;

    const handleDownload = () => {
        if (reportData) {
            // 1. Create a dynamic filename
            let fileName = 'ksaptb_financial_report';
            if (tourId && allTours) {
                const tour = allTours.find(t => t._id === tourId);
                if (tour) {
                    fileName += `_${tour.title.replace(/\s+/g, '-')}`;
                }
            } else if (year) {
                fileName += `_${year}`;
                if (month) {
                    const monthName = months.find(m => m.value === month)?.label;
                    if (monthName) {
                        fileName += `_${monthName}`;
                    }
                }
            }
            fileName += '.csv';

            // 2. Prepare data for CSV
            const dataForCsv = reportData.map(row => ({
                'Booking ID': row.bookingId,
                'Customer': row.customerName,
                'Tour Name': row.tourName,
                'Tour Date': row.tourDate,
                'Tickets': row.ticketCount,
                'Status': row.bookingStatus,
                'Amount (SAR)': row.amount.toFixed(2),
                'Payment Status': row.paymentStatus,
                'Created At': row.createdAt,
            }));

            // 3. Convert to CSV and download
            const csv = convertToCSV(dataForCsv);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const resetFilters = () => {
        setYear(undefined);
        setMonth(undefined);
        setTourId(undefined);
    };

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2023;
        let yearOptions = [];
        for (let y = currentYear; y >= startYear; y--) {
            yearOptions.push(y);
        }
        return yearOptions;
    }, []);

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
    ];
    
    const completedTours = allTours?.filter(tour => tour.isCompleted);

    if (reportData === undefined) {
        return <div>Loading report...</div>;
    }

    return (
        <div className="space-y-8">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Link href="/admin">
                    <Button variant="outline" className="gap-2 border-slate-300">
                        <ArrowLeft className="w-4 h-4" />
                        Return to Dashboard
                    </Button>
                </Link>
                <Button onClick={handleDownload} disabled={!reportData || reportData.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Download as CSV
                </Button>
            </div>

            {/* === Filters === */}
            <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-slate-50">
                <h3 className="text-lg font-semibold mr-4">Filters</h3>

                {/* Tour Filter */}
                <Select onValueChange={setTourId} value={tourId}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Filter by Tour" />
                    </SelectTrigger>
                    <SelectContent>
                        {completedTours?.map(tour => (
                            <SelectItem key={tour._id} value={tour._id}>{tour.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Year Filter */}
                <Select onValueChange={(val) => setYear(Number(val))} value={year?.toString()}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Month Filter */}
                <Select onValueChange={(val) => setMonth(Number(val))} value={month?.toString()} disabled={!year}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(m => (
                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="ghost" onClick={resetFilters} className="gap-2 text-slate-600 hover:text-slate-800">
                    <FilterX className="w-4 h-4" />
                    Reset
                </Button>
            </div>

            {/* === Summary Cards === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">SAR {totalRevenue?.toFixed(2) ?? '0.00'}</div>
                        <p className="text-xs text-muted-foreground">From completed tours</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets Sold</CardTitle>
                        <Ticket className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalTickets ?? 0}</div>
                        <p className="text-xs text-muted-foreground">For all confirmed bookings</p>
                    </CardContent>
                </Card>
            </div>

            {/* === Detailed Table === */}
            <div className="border rounded-lg shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Booking ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Tour Name</TableHead>
                            <TableHead>Tour Date</TableHead>
                            <TableHead>Tickets</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount (SAR)</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{row.bookingId}</TableCell>
                                <TableCell>{row.customerName}</TableCell>
                                <TableCell>{row.tourName}</TableCell>
                                <TableCell>{row.tourDate}</TableCell>
                                <TableCell>{row.ticketCount}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.bookingStatus === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {row.bookingStatus}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-medium">{row.amount.toFixed(2)}</TableCell>
                                <TableCell>{row.paymentStatus}</TableCell>
                                <TableCell>{row.createdAt}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             {reportData.length === 0 && (
                <div className="text-center text-slate-500 py-10">
                    <p>No completed bookings found for the selected filters.</p>
                </div>
            )}
        </div>
    );
}
