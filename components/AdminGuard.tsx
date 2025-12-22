"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignIn, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation"; // 1. Import usePathname
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const router = useRouter();
  const pathname = usePathname(); // 2. Get current URL path (e.g., "/admin")
  
  // Safe Query: Skip if not signed in
  const user = useQuery(api.users.current, isSignedIn ? {} : "skip");

  // 1. LOADING STATE
  if (!isLoaded || (isSignedIn && user === undefined)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // 2. NOT LOGGED IN: Show Login Form
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-100 gap-4">
        <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
            <p className="text-slate-500">Please sign in to continue</p>
        </div>
        
        {/* 3. Force redirect back to current page after login */}
        <SignIn 
            routing="hash" 
            forceRedirectUrl={pathname} 
        />
      </div>
    );
  }

  // 3. LOGGED IN BUT NOT ADMIN
  if (user && user.role !== "admin") {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-red-50 gap-4">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-red-100">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-red-900 mb-2">Access Denied</h1>
                <p className="text-red-600 mb-6">
                    You are logged in as <strong>{clerkUser?.emailAddresses[0].emailAddress}</strong>, 
                    but you do not have administrator permissions.
                </p>
                <button 
                    onClick={() => router.push("/")}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                    Return Home
                </button>
            </div>
        </div>
    );
  }

  // 4. IS ADMIN
  return <>{children}</>;
}