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