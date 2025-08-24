import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simple property-type -> emoji icon helper used in cards/pages.
 */
export function getPropertyTypeIcon(type?: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("hotel")) return "🏨";
  if (t.includes("penthouse")) return "🏙️";
  if (t.includes("villa")) return "🏡";
  if (t.includes("town") || t.includes("house")) return "🏠";
  return "🏢"; // default apartment/other
}

/**
 * Validate an image File or URL.
 * Returns an object with { valid: boolean, error?: string }.
 */
export function isImageValid(
  input: File | string,
  opts?: {
    maxSizeKB?: number; // default 300 KB (your UI copy mentions 300KB)
    allowedTypes?: string[]; // default common web image types
    allowedExts?: string[];  // default common web image extensions
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
  const allowedExts = (opts?.allowedExts ?? ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"])
    .map((e) => e.toLowerCase());

  // If it's a File
  if (typeof File !== "undefined" && input instanceof File) {
    const sizeOk = input.size <= maxSizeKB * 1024;
    if (!sizeOk) {
      return { valid: false, error: `Image is too large. Max ${maxSizeKB}KB.` };
    }
    // Some browsers may not set type for unknown files; allow if empty but extension matches.
    const typeOk = !input.type || allowedTypes.includes(input.type);
    if (!typeOk) {
      return { valid: false, error: "Unsupported image type. Use PNG or JPG." };
    }
    // Extension check as extra safeguard
    const name = input.name?.toLowerCase() || "";
    const ext = name.split(".").pop() || "";
    if (ext && !allowedExts.includes(ext)) {
      return { valid: false, error: "Unsupported image extension." };
    }
    return { valid: true };
  }

  // Otherwise treat as string/URL
  const str = String(input || "").trim();
  if (!str) return { valid: false, error: "No image provided." };
  if (str.startsWith("data:image/")) return { valid: true };

  const extMatch = str.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  if (extMatch) {
    const ext = extMatch[1];
    if (!allowedExts.includes(ext)) {
      return { valid: false, error: "Unsupported image URL extension." };
    }
    return { valid: true };
  }

  // Fallback for http(s) URLs — cannot verify content without fetching.
  if (/^https?:\/\//i.test(str)) return { valid: true };

  return { valid: false, error: "Invalid image input." };
}

/**
 * Resize & compress an image File in the browser using a canvas.
 * Keeps aspect ratio, fitting within the provided maxWidth/maxHeight.
 * Returns a new File (JPEG for jpg/jpeg input, else PNG by default).
 */
export async function resizeAndOptimizeImage(
  file: File,
  maxWidth = 100,
  maxHeight = 100,
  quality = 0.8
): Promise<File> {
  // Only run in browser
