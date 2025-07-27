import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { toast } from 'sonner';

// Storage configuration
const STORAGE_CONFIG = {
  bucket: import.meta.env.VITE_AWS_S3_BUCKET || 'scopostay-storage-prod',
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  cdnDomain: import.meta.env.VITE_CDN_DOMAIN || 'https://cdn.scopostay.com',
};

export interface StorageUsage {
  totalBytes: number;
  photosBytes: number;
  reportsBytes: number;
  fileCount: number;
  quotaBytes: number;
  usagePercentage: number;
  tier: string;
}

export interface FileMetadata {
  id: string;
  fileKey: string;
  fileName: string;
  fileType: 'photo' | 'report';
  fileSize: number;
  mimeType: string;
  inspectionId?: string;
  uploadStatus: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// Storage quota enforcement
export async function checkStorageQuota(additionalBytes: number = 0): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Storage quota check bypassed');
      return true;
    }

    // Get admin ID
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error('Admin account not found');
    }

    // Call storage quota check function
    const { data, error } = await supabase.rpc('check_storage_quota', {
      target_admin_id: adminData.id,
      additional_bytes: additionalBytes,
    });

    if (error) {
      console.error('Error checking storage quota:', error);
      return false;
    }

    return data;
  } catch (error: any) {
    console.error('Error checking storage quota:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    return false;
  }
}

// Get storage usage for current admin
export async function getStorageUsage(): Promise<StorageUsage | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock storage usage');
      return {
        totalBytes: 1073741824, // 1GB
        photosBytes: 805306368, // 768MB
        reportsBytes: 268435456, // 256MB
        fileCount: 150,
        quotaBytes: 5368709120, // 5GB (Professional tier)
        usagePercentage: 20,
        tier: 'professional',
      };
    }

    // Get admin data with tier and usage
    const { data, error } = await supabase
      .from('admin')
      .select(`
        id,
        subscription_tier,
        storage_usage (
          total_bytes,
          photos_bytes,
          reports_bytes,
          file_count,
          last_calculated_at
        ),
        storage_quotas!inner (
          quota_bytes
        )
      `)
      .eq('owner_id', user.id)
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    const usage = data.storage_usage?.[0];
    const quota = data.storage_quotas?.quota_bytes || 0;
    const totalBytes = usage?.total_bytes || 0;

    return {
      totalBytes,
      photosBytes: usage?.photos_bytes || 0,
      reportsBytes: usage?.reports_bytes || 0,
      fileCount: usage?.file_count || 0,
      quotaBytes: quota,
      usagePercentage: quota > 0 ? Math.round((totalBytes / quota) * 100) : 0,
      tier: data.subscription_tier || 'starter',
    };
  } catch (error: any) {
    console.error('Error getting storage usage:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    return null;
  }
}

// Upload file using Supabase storage for now (can be replaced with AWS S3 later)
export async function uploadFile(
  file: File,
  fileType: 'photo' | 'report',
  inspectionId?: string,
  inspectionItemId?: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Mock file upload');
      // Simulate upload progress
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          setTimeout(() => onProgress(i), i * 10);
        }
      }
      return `https://example.com/mock-file-${Date.now()}.${file.name.split('.').pop()}`;
    }

    // Check storage quota before upload
    const canUpload = await checkStorageQuota(file.size);
    if (!canUpload) {
      throw new Error('Storage quota exceeded. Please upgrade your plan or free up space.');
    }

    // Get admin ID
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error('Admin account not found');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filePath = `${fileType}s/${adminData.id}/${inspectionId || 'general'}/${timestamp}.${fileExtension}`;

    // Determine bucket based on file type
    const bucketName = fileType === 'photo' ? 'inspection-photos' : 'inspection-reports';

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Create file metadata record
    const { error: metadataError } = await supabase
      .from('file_metadata')
      .insert({
        admin_id: adminData.id,
        file_key: filePath,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        inspection_id: inspectionId,
        inspection_item_id: inspectionItemId,
        s3_bucket: bucketName,
        s3_region: 'us-east-1',
        upload_status: 'completed',
      });

    if (metadataError) {
      console.error('Error saving file metadata:', metadataError);
      // Continue despite metadata error
    }

    if (onProgress) {
      onProgress(100);
    }

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    throw error;
  }
}

// Generate signed URL for secure downloads (using Supabase for now)
export async function getSignedDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock signed URL');
      return `https://example.com/signed/${fileKey}?expires=${Date.now() + expiresIn * 1000}`;
    }

    // Verify user has access to this file
    const { data: fileData, error: fileError } = await supabase
      .from('file_metadata')
      .select('admin_id, s3_bucket')
      .eq('file_key', fileKey)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found or access denied');
    }

    // Generate signed URL using Supabase
    const { data, error } = await supabase.storage
      .from(fileData.s3_bucket)
      .createSignedUrl(fileKey, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    return null;
  }
}

// Delete file from storage
export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Mock file deletion');
      return true;
    }

    // Verify user has access to this file
    const { data: fileData, error: fileError } = await supabase
      .from('file_metadata')
      .select('admin_id, s3_bucket')
      .eq('file_key', fileKey)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found or access denied');
    }

    // Delete from Supabase storage
    const { error: deleteError } = await supabase.storage
      .from(fileData.s3_bucket)
      .remove([fileKey]);

    if (deleteError) {
      throw deleteError;
    }

    // Remove metadata record
    await supabase
      .from('file_metadata')
      .delete()
      .eq('file_key', fileKey);

    return true;
  } catch (error: any) {
    console.error('Error deleting file:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    return false;
  }
}

// Get file metadata
export async function getFileMetadata(fileKey: string): Promise<FileMetadata | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock file metadata');
      return {
        id: 'mock-file-id',
        fileKey,
        fileName: 'mock-file.jpg',
        fileType: 'photo',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
        uploadStatus: 'completed',
        createdAt: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('file_key', fileKey)
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
      }
      return null;
    }

    return {
      id: data.id,
      fileKey: data.file_key,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      inspectionId: data.inspection_id,
      uploadStatus: data.upload_status,
      createdAt: data.created_at,
    };
  } catch (error: any) {
    console.error('Error getting file metadata:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    return null;
  }
}

// Batch file operations for migration
export async function migrateFileFromSupabase(
  supabaseUrl: string,
  targetFileKey: string,
  fileType: 'photo' | 'report',
  inspectionId?: string
): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    if (devModeEnabled()) {
      console.log('Dev mode: Mock file migration');
      return true;
    }

    // Download from Supabase
    const response = await fetch(supabaseUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const fileBlob = await response.blob();
    const fileName = targetFileKey.split('/').pop() || 'migrated-file';
    const file = new File([fileBlob], fileName, { type: fileBlob.type });

    // Upload to new storage
    const newUrl = await uploadFile(file, fileType, inspectionId);
    
    return !!newUrl;
  } catch (error: any) {
    console.error('Error migrating file:', error);
    return false;
  }
}

// Format bytes for display
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Calculate storage tier recommendations
export function getStorageRecommendation(currentUsage: StorageUsage): {
  recommendation: string;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
} {
  const { usagePercentage, tier } = currentUsage;

  if (usagePercentage >= 95) {
    return {
      recommendation: 'Immediate upgrade required',
      reasoning: 'Storage is critically full. Uploads may fail.',
      urgency: 'high',
    };
  }

  if (usagePercentage >= 80) {
    return {
      recommendation: 'Consider upgrading soon',
      reasoning: 'Storage is approaching capacity. Plan for upgrade.',
      urgency: 'medium',
    };
  }

  if (usagePercentage >= 60 && tier === 'starter') {
    return {
      recommendation: 'Monitor usage closely',
      reasoning: 'Usage is growing. Consider Professional tier for more space.',
      urgency: 'low',
    };
  }

  return {
    recommendation: 'Storage levels healthy',
    reasoning: 'Current usage is within acceptable limits.',
    urgency: 'low',
  };
}