import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { Inspection, InspectionItem, InspectionType, InspectionStatus } from '../types';

// Mock data for dev mode
const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: 'mock-inspection-1',
    propertyId: 'mock-property-1',
    propertyChecklistId: 'mock-checklist-1',
    inspectorId: 'dev-user-id',
    inspectionType: 'check_in',
    primaryContactName: 'John Smith',
    inspectorName: 'Jane Inspector',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    durationSeconds: 3600, // 1 hour
    primaryContactSignatureUrl: 'https://example.com/guest-signature.png',
    inspectorSignatureImageUrl: 'https://example.com/inspector-signature.png',
    clientPresentForSignature: true,
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_INSPECTION_ITEMS: InspectionItem[] = [
  {
    id: 'mock-inspection-item-1',
    inspectionId: 'mock-inspection-1',
    templateItemId: 'mock-item-1',
    value: 'Yes',
    notes: 'All appliances working perfectly',
    photoUrls: ['https://example.com/photo1.webp'],
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-inspection-item-2',
    inspectionId: 'mock-inspection-1',
    templateItemId: 'mock-item-2',
    value: null,
    notes: 'Countertops in excellent condition',
    photoUrls: ['https://example.com/photo2.webp', 'https://example.com/photo3.webp'],
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockInspectionsState = [...MOCK_INSPECTIONS];
let mockInspectionItemsState = [...MOCK_INSPECTION_ITEMS];

export async function createInspection(
  propertyId: string,
  propertyChecklistId: string,
  inspectionType: InspectionType,
  primaryContactName?: string,
  inspectorName?: string,
  clientPresentForSignature?: boolean
): Promise<Inspection | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock inspection');
      const newInspection: Inspection = {
        id: `mock-inspection-${Date.now()}`,
        propertyId,
        propertyChecklistId,
        inspectorId: user.id,
        inspectionType,
        primaryContactName,
        inspectorName,
        clientPresentForSignature: clientPresentForSignature || false,
        startTime: new Date().toISOString(),
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockInspectionsState.push(newInspection);
      return newInspection;
    }

    const { data, error } = await supabase
      .from('inspections')
      .insert([{
        property_id: propertyId,
        property_checklist_id: propertyChecklistId,
        inspector_id: user.id,
        inspection_type: inspectionType,
        primary_contact_name: primaryContactName,
        inspector_name: inspectorName,
        client_present_for_signature: clientPresentForSignature || false,
        start_time: new Date().toISOString(),
        status: 'in_progress',
      }])
      .select()
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error creating inspection:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getInspectionDetails(inspectionId: string): Promise<{
  inspection: Inspection;
  items: InspectionItem[];
} | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Getting mock inspection details for ID:', inspectionId);
      const inspection = mockInspectionsState.find(i => i.id === inspectionId);
      if (!inspection) {
        throw new Error('Inspection not found');
      }
      
      const items = mockInspectionItemsState
        .filter(item => item.inspectionId === inspectionId)
        .sort((a, b) => a.order - b.order);
      
      return { inspection, items };
    }

    const [inspectionResponse, itemsResponse] = await Promise.all([
      supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .single(),
      supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('order_index')
    ]);

    if (inspectionResponse.error) {
      if (inspectionResponse.error.message?.includes('user_not_found') || inspectionResponse.error.message?.includes('JWT')) {
        await handleAuthError(inspectionResponse.error);
        return null;
      }
      throw inspectionResponse.error;
    }

    if (itemsResponse.error) {
      if (itemsResponse.error.message?.includes('user_not_found') || itemsResponse.error.message?.includes('JWT')) {
        await handleAuthError(itemsResponse.error);
        return null;
      }
      throw itemsResponse.error;
    }

    return {
      inspection: inspectionResponse.data,
      items: itemsResponse.data
    };
  } catch (error: any) {
    console.error('Error fetching inspection details:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function updateInspectionItem(
  inspectionItemId: string,
  value: any,
  notes?: string,
  photoUrls?: string[]
): Promise<InspectionItem | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Updating mock inspection item:', inspectionItemId);
      const itemIndex = mockInspectionItemsState.findIndex(item => item.id === inspectionItemId);
      if (itemIndex === -1) {
        throw new Error('Inspection item not found');
      }
      
      const updatedItem = {
        ...mockInspectionItemsState[itemIndex],
        value,
        notes,
        photoUrls,
        updatedAt: new Date().toISOString(),
      };
      
      mockInspectionItemsState[itemIndex] = updatedItem;
      return updatedItem;
    }

    const updateData: any = { value };
    if (notes !== undefined) updateData.notes = notes;
    if (photoUrls !== undefined) updateData.photo_urls = photoUrls;

    const { data, error } = await supabase
      .from('inspection_items')
      .update(updateData)
      .eq('id', inspectionItemId)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error updating inspection item:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function updateInspectionStatus(
  inspectionId: string,
  status: InspectionStatus,
  primaryContactSignatureUrl?: string,
  inspectorSignatureImageUrl?: string,
  endTime?: string,
  durationSeconds?: number
): Promise<Inspection | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Updating mock inspection status:', inspectionId);
      const inspectionIndex = mockInspectionsState.findIndex(i => i.id === inspectionId);
      if (inspectionIndex === -1) {
        throw new Error('Inspection not found');
      }
      
      const updatedInspection = {
        ...mockInspectionsState[inspectionIndex],
        status,
        primaryContactSignatureUrl,
        inspectorSignatureImageUrl,
        endTime,
        durationSeconds,
        updatedAt: new Date().toISOString(),
      };
      
      mockInspectionsState[inspectionIndex] = updatedInspection;
      return updatedInspection;
    }

    const updateData: any = { status };
    if (primaryContactSignatureUrl !== undefined) updateData.primary_contact_signature_url = primaryContactSignatureUrl;
    if (inspectorSignatureImageUrl !== undefined) updateData.inspector_signature_image_url = inspectorSignatureImageUrl;
    if (endTime !== undefined) updateData.end_time = endTime;
    if (durationSeconds !== undefined) updateData.duration_seconds = durationSeconds;

    const { data, error } = await supabase
      .from('inspections')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error updating inspection status:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function uploadInspectionPhoto(
  file: File,
  inspectionId: string,
  itemId: string
): Promise<string | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock photo upload for inspection:', inspectionId);
      // Return a mock URL
      return `https://example.com/mock-photo-${Date.now()}.webp`;
    }

    // Convert image to WebP format (client-side conversion)
    const webpFile = await convertToWebP(file);
    
    const fileName = `inspections/${inspectionId}/items/${itemId}/${Date.now()}.webp`;
    
    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(fileName, webpFile);

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading inspection photo:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

// Helper function to convert image to WebP format
async function convertToWebP(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
            });
            resolve(webpFile);
          } else {
            reject(new Error('Failed to convert image to WebP'));
          }
        }, 'image/webp', 0.8); // 80% quality
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function getInspectionsForProperty(propertyId: string): Promise<Inspection[] | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Getting mock inspections for property:', propertyId);
      return mockInspectionsState.filter(i => i.propertyId === propertyId);
    }

    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error fetching inspections for property:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}