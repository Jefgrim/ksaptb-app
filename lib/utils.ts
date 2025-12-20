import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// --- GLOBAL TIMEZONE CONFIGURATION ---
const APP_TIMEZONE = "Asia/Riyadh"; // KSA Time
const APP_LOCALE = "en-US"; // or 'ar-SA' if you want Arabic numbers

export function formatDate(timestamp: number | Date) {
  if (!timestamp) return "";
  
  return new Date(timestamp).toLocaleDateString(APP_LOCALE, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: APP_TIMEZONE, // <--- Forces KSA Time everywhere
  });
}

export function formatDateTime(timestamp: number | Date) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(APP_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE, // <--- Forces KSA Time everywhere
  });
}

export function formatTime(timestamp: number | Date) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleTimeString(APP_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  });
}