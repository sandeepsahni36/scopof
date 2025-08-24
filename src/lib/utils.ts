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
  opts?: { maxSizeKB?: number; allowedTypes?: string[]; allowedExts?: string[] }
): { valid: boolean; error?: string } {
  const maxSizeKB = opts?.maxSizeKB ?? 300;
  const allowedTypes = opts?.allowedTypes ?? [
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  const allowedExts = (opts?.allowedExts ?? ["png", "jpg", "jpeg"]).map((e) =>
    e.toLowerCase()
  );

  // File case
  if (typeof File !== "undefined" && input instanceof File) {
    if (input.size > maxSizeKB * 1024) {
      return { valid: false, error: `Image is too large. Max ${maxSizeKB}KB.` };
    }
    if (input.type && !allowedTypes.includes(input.type)) {
      return { valid: false, error: "Unsupported image type. Use PNG/JPG." };
    }
    const name = input.name?.toLowerCase() || "";
    const ext = name.split(".").pop() || "";
    if (ext && !allowedExts.includes(ext)) {
      return { valid: false, error: "Unsupported image extension." };
    }
    return { valid: true };
  }

  // String (URL/DataURL)
  const str = String(input || "").trim();
  if (!str) return { valid: false, error: "No image provided." };
  if (str.startsWith("data:image/")) return { valid: true };
  const extMatch = str.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  if (extMatch && !allowedExts.includes(extMatch[1])) {
    return { valid: false, error: "Unsupported image URL extension." };
  }
  if (/^https?:\/\//i.test(str)) return { valid: true };
  return { valid: false, error: "Invalid image input." };
}

/**
 * Resize & optimize an image (browser only). Falls back to original file elsewhere.
 */
export async function resizeAndOptimizeImage(
  file: File,
  maxWidth = 100,
  maxHeight = 100,
  quality = 0.8
): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  const dataURL = await readFileAsDataURL(file);
  const img = await loadHTMLImage(dataURL);

  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const targetW = Math.max(1, Math.round(img.width * ratio));
  const targetH = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const isJpeg = (file.type || "").toLowerCase().includes("jpg") || (file.type || "").toLowerCase().includes("jpeg");
  const outType = isJpeg ? "image/jpeg" : "image/png";
  const q = Math.min(1, Math.max(0.1, Number.isFinite(quality) ? Number(quality) : 0.8));

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), outType, isJpeg ? q : undefined);
  });

  const newName = file.name.replace(/\.(\w+)$/, isJpeg ? ".jpg" : ".png");
  return new File([blob], newName, { type: outType, lastModified: Date.now() });
}

// ---- helpers ----
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error || new Error("File read failed"));
    fr.readAsDataURL(file);
  });
}

function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}
