// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Emoji icon helper for property types
export function getPropertyTypeIcon(type?: string): string {
  switch ((type || "").toLowerCase()) {
    case "apartment":
      return "🏢";
    case "hotel_apartment":
      return "🏨";
    case "penthouse":
      return "🏙️";
    case "villa":
      return "🏡";
    case "townhouse":
      return "🏘️";
    default:
      return "🏢";
  }
}
