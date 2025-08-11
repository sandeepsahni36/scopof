import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function generateId() {
  return uuidv4();
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getTrialEndDate() {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(now.getDate() + 14);
  return trialEnd;
}

export function isImageValid(file: File) {
  // Check file size (max 300kb)
  if (file.size > 300 * 1024) {
    return { valid: false, error: 'Image must be less than 300KB' };
  }
  
  // Check file type
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return { valid: false, error: 'Only JPG and PNG formats are supported' };
  }
  
  return { valid: true, error: null };
}

export async function resizeAndOptimizeImage(
  file: File,
  targetWidth: number = 100,
  targetHeight: number = 100,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas dimensions to target size
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      if (ctx) {
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        // Center the image
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        // Draw the resized image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpeg'), {
              type: 'image/jpeg',
            });
            resolve(optimizedFile);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        }, 'image/jpeg', quality);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}
export function getPropertyTypeIcon(type: string) {
  switch (type) {
    case 'villa':
      return '🏖️';
    case 'house':
      return '🏠';
    case 'condo':
      return '🏢';
    default:
      return '🏠';
  }
}