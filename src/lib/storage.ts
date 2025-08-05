import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';

export interface UploadResult {
  fileUrl: string;
  fileKey: string;
  metadataId: string;
}

export interface StorageUsage {
  currentUsage: number;
  photosUsage: number;
  reportsUsage: number;
  fileCount: number;
  quota: number;
  tier: string;
}

export async function uploadFile(
  file: File,
  fileType: 'photo' | 'report',
  inspectionId?: string,
  inspectionItemId?: string
): Promise<UploadResult | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock file upload');
      return {
        fileUrl: `https://example.com/mock-${fileType}-${Date.now()}.${file.type.split('/')[1]}`,
        fileKey: `mock-${fileType}-${Date.now()}`,
        metadataId: `mock-metadata-${Date.now()}`,
      };
    }

    // Get user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session token found');
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    if (inspectionId) formData.append('inspectionId', inspectionId);
    if (inspectionItemId) formData.append('inspectionItemId', inspectionItemId);

    console.log('Uploading file via storage-api:', {
      fileName: file.name,
      fileSize: file.size,
      fileType,
      inspectionId,
      inspectionItemId
    });

    // Call the custom storage API Edge Function using fetch for proper FormData handling
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-api/upload/${fileType}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Storage API error:', errorData);
      
      // Check if it's an authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError(new Error(errorData.error || 'Authentication failed'));
        return null;
      }
      
      throw new Error(errorData.error || 'Failed to upload file');
    }

    const data = await response.json();

    if (!data || !data.fileUrl) {
      throw new Error('No file URL returned from storage API');
    }

    console.log('File uploaded successfully:', {
      fileUrl: data.fileUrl,
      fileKey: data.fileKey,
      metadataId: data.metadataId
    });

    return {
      fileUrl: data.fileUrl,
      fileKey: data.fileKey,
      metadataId: data.metadataId,
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock file deletion');
      return true;
    }

    // Get user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session token found');
    }

    console.log('Deleting file via storage-api:', fileKey);

    // Call the custom storage API Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-api/delete/${fileKey}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Storage API delete error:', errorData);
      
      // Check if it's an authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError(new Error(errorData.error || 'Authentication failed'));
        return false;
      }
      
      throw new Error(errorData.error || 'Failed to delete file');
    }

    console.log('File deleted successfully:', fileKey);
    return true;
  } catch (error: any) {
    console.error('Error deleting file:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}

export async function getStorageUsage(): Promise<StorageUsage | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock storage usage');
      return {
        currentUsage: 1024 * 1024 * 500, // 500MB
        photosUsage: 1024 * 1024 * 300, // 300MB
        reportsUsage: 1024 * 1024 * 200, // 200MB
        fileCount: 150,
        quota: 1024 * 1024 * 1024 * 5, // 5GB
        tier: 'professional',
      };
    }

    // Get user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session token found');
    }

    console.log('Fetching storage usage via storage-api');

    // Call the custom storage API Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-api/usage`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Storage API usage error:', errorData);
      
      // Check if it's an authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError(new Error(errorData.error || 'Authentication failed'));
        return null;
      }
      
      throw new Error(errorData.error || 'Failed to fetch storage usage');
    }

    const usageData = await response.json();
    console.log('Storage usage fetched successfully:', usageData);

    return usageData;
  } catch (error: any) {
    console.error('Error fetching storage usage:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getSignedUrlForFile(fileKey: string): Promise<string | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock signed URL for file:', fileKey);
      return `https://example.com/mock-signed-url/${fileKey}?expires=${Date.now() + 300000}`;
    }

    // Get user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session token found');
    }

    console.log('Getting signed URL for file:', fileKey);

    // Call the storage API to get a pre-signed URL
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-api/download/${fileKey}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Storage API download error:', errorData);
      
      // Check if it's an authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError(new Error(errorData.error || 'Authentication failed'));
        return null;
      }
      
      throw new Error(errorData.error || 'Failed to get signed URL');
    }

    const data = await response.json();

    if (!data || !data.fileUrl) {
      throw new Error('No signed URL returned from storage API');
    }

    console.log('Signed URL generated successfully for file:', fileKey);
    return data.fileUrl;
  } catch (error: any) {
    console.error('Error getting signed URL for file:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getUsagePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}