"use client";

import { useUser, SignIn } from "@clerk/nextjs";
import { usePathname } from "next/navigation"; // 1. Import usePathname
import { Loader2 } from "lucide-react";

export default function UserGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname(); // 2. Get current URL path

  // 1. LOADING STATE
  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // 2. NOT LOGGED IN: Show Login Form
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4 p-4">
        <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Sign In Required</h1>
            <p className="text-slate-500">Please sign in to access this page</p>
        </div>
        
        {/* 3. Force redirect back to current page after login */}
        <SignIn 
            routing="hash" 
            forceRedirectUrl={pathname} 
        />
      </div>
    );
  }

  // 3. LOGGED IN: Render the protected page
  return <>{children}</>;
}