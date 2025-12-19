"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export default function UserSync() {
  const { user } = useUser();
  // Ensure 'users' is exported from your Convex functions and appears in the generated API
  const storeUser = useMutation(api.users?.store);

  useEffect(() => {
    if (user?.emailAddresses[0]?.emailAddress) {
      storeUser({ email: user.emailAddresses[0].emailAddress });
    }
  }, [user, storeUser]);

  return null;
}