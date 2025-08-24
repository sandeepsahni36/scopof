// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPropertyTypeIcon(type?: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("hotel")) return "🏨";
  if (t.includes("penthouse")) return "🏙️";
  if (t.includes("villa")) return "🏡";
  if (t.includes("town") || t.includes("house")) return "🏠";
  return "🏢";
}

export function isImageValid(
  input: File | string,
  opts?: {
    maxSizeKB?: number;
    allowedTypes?: string[];
    allowedExts?: string[];
  }
): { valid: boolean; error?: string } {
  const maxSizeKB = opts?.maxSizeKB ?? 300;
  const allowedTypes = opts?.allowedTypes ?? [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/bmp",
  ];
  const allowedExts = (opts?.allowedExts ?? ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"]).map((e) =>
    e.toLowerCase()
  );

  if (typeof File !== "undefined" && input instanceof File) {
    if (input.size > maxSizeKB * 1024) {
      return { valid: false, error: `Image is too large. Max ${maxSizeKB}KB.` };
    }
    const typeOk = !input.type || allowedTypes.includes(input.type);
    if (!typeOk) return { valid: false, error: "Unsupported image type. Use PNG or JPG." };

    const name = input.name?.toLowerCase() || "";
    const ext = name.split(".").pop() ||
