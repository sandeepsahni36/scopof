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

// Core types
export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user';
  createdAt: string;
};

export type Company = {
  id: string;
  name: string;
  customerId?: string;
  logo?: string;
  brandColor?: string;
  reportBackground?: string;
  tier: 'starter' | 'professional' | 'enterprise';
  trialEndsAt?: string;
  subscription_status?: string;
  createdAt: string;
  updatedAt: string;
};

export type Property = {
  id: string;
  companyId: string; // This maps to admin_id in the database
  name: string;
  address: string;
  type: 'apartment' | 'hotel_apartment' | 'penthouse' | 'villa';
  bedrooms: string;
  bathrooms: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Template types
export type TemplateCategory = {
  id: string;
  adminId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Template = {
  id: string;
  adminId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateItemType = 'text' | 'single_choice' | 'multiple_choice' | 'photo' | 'section';
export type TemplateItemType = 'text' | 'single_choice' | 'multiple_choice' | 'photo' | 'divider' | 'number';

// Rating button option structure for single/multiple choice fields
export type RatingOption = {
  label: string;
  color: string;
};

// Available colors for rating buttons
export const RATING_COLORS = {
  green: '#22C55E',
  red: '#EF4444',
  orange: '#F97316',
  blue: '#3B82F6',
} as const;

export const TEMPLATE_COLORS = [
  '#3B82F6', // Blue
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#F97316', // Orange
  '#EF4444', // Red
] as const;

export type RatingColorKey = keyof typeof RATING_COLORS;
export type TemplateItem = {
  id: string;
  templateId: string;
  type: TemplateItemType;
  label: string;
  required: boolean;
  options: string[] | RatingOption[] | null;
  reportEnabled: boolean;
  maintenanceEmail: string | null;
  reportRecipientId?: string | null; // New field for report recipient
  order: number;
  createdAt: string;
  updatedAt: string;
};

// Report Service Teams type
export type ReportServiceTeam = {
  id: string;
  adminId: string;
  designation: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

// Report type
export type Report = {
  id: string;
  inspectionId: string;
  reportUrl: string;
  reportType: string;
  generatedAt: string;
  propertyName?: string;
  inspectionType?: InspectionType;
  primaryContactName?: string;
  createdAt: string;
  updatedAt: string;
};

// Inspection types
export type InspectionType = 'check_in' | 'check_out' | 'move_in' | 'move_out';
export type InspectionStatus = 'in_progress' | 'completed' | 'canceled';

export type Inspection = {
  id: string;
  propertyId: string;
  propertyChecklistId?: string;
  inspectorId: string;
  inspectionType: InspectionType;
  primaryContactName?: string;
  inspectorName?: string; // Added inspector name
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  primaryContactSignatureUrl?: string; // Primary contact signature
  inspectorSignatureImageUrl?: string; // Inspector signature
  clientPresentForSignature?: boolean; // For real estate inspections
  status: InspectionStatus;
  createdAt: string;
  updatedAt: string;
};

export type InspectionItem = {
  id: string;
  inspectionId: string;
  templateItemId: string;
  value?: any; // JSON value for different input types
  notes?: string;
  photoUrls?: string[];
  markedForReport?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

// Property Checklist types (for future implementation)
export type PropertyChecklist = {
  id: string;
  propertyId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type PropertyChecklistTemplate = {
  id: string;
  propertyChecklistId: string;
  templateId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

// Subscription tier limitations
export type TierLimits = {
  properties: number;
  storage: number;
  users: number; // Total users (admins + members)
  adminUsers: number; // Limit for admin roles (owner + admin)
  features: string[];
};

export const TIER_LIMITS: Record<string, TierLimits> = {
  starter: {
    properties: 10,
    storage: 2,
    users: 2, // 1 Admin + 1 User
    adminUsers: 1,
    features: ['basic-ai', 'standard-templates', 'pdf-reports', 'email-support'],
  },
  professional: {
    properties: 45,
    storage: 5,
    users: 5, // 2 Admins + 3 Users
    adminUsers: 2,
    features: ['advanced-ai', 'custom-templates', 'branded-reports', 'priority-support'],
  },
  enterprise: {
    properties: Infinity,
    storage: Infinity,
    users: 15, // 5 Admins + 10 Users
    adminUsers: 5,
    features: [
      'enterprise-ai',
      'team-collaboration',
      'api-access',
      'white-label',
    ],
  },
};

// Navigation types
export type NavItem = {
  title: string;
  href: string;
  icon: string;
};