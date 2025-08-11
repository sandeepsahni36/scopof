import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { Inspection, InspectionItem, InspectionType, InspectionStatus } from '../types';
import { uploadFile } from './storage';

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

    // First create the inspection
    const { data: inspection, error: inspectionError } = await supabase
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

    if (inspectionError) {
      if (inspectionError.message?.includes('user_not_found') || inspectionError.message?.includes('JWT')) {
        await handleAuthError(inspectionError);
        return null;
      }
      throw inspectionError;
    }

    // Get the templates for this checklist to create inspection items
    const { data: checklistTemplates, error: templatesError } = await supabase
      .from('property_checklist_templates')
      .select(`
        template_id,
        order_index,
        templates!inner(
          id,
          name,
          template_items(
            id,
            type,
            label,
            required,
            options,
            report_enabled,
            maintenance_email,
            report_recipient_id,
            order
          )
        )
      `)
      .eq('property_checklist_id', propertyChecklistId)
      .order('order_index');

    if (templatesError) {
      console.error('Error fetching checklist templates:', templatesError);
      // Continue without pre-creating items - they can be created on-demand
    } else if (checklistTemplates) {
      // Create inspection items for all template items
      const inspectionItems = [];
      let orderIndex = 0;

      for (const checklistTemplate of checklistTemplates) {
        const template = checklistTemplate.templates;
        if (template && template.template_items) {
          for (const templateItem of template.template_items) {
            inspectionItems.push({
              inspection_id: inspection.id,
              template_item_id: templateItem.id,
              value: null,
              notes: null,
              photo_urls: null,
              order_index: orderIndex++,
            });
          }
        }
      }

      if (inspectionItems.length > 0) {
        const { data: createdInspectionItems, error: itemsError } = await supabase
          .from('inspection_items')
          .insert(inspectionItems)
          .select();

        console.log('=== INSPECTION ITEMS CREATION DEBUG ===');
        console.log('Items to insert:', inspectionItems.length);
        console.log('Items error:', itemsError);
        console.log('Created items count:', createdInspectionItems?.length || 0);
        console.log('Created items sample:', createdInspectionItems?.slice(0, 3));
        console.log('=== END INSPECTION ITEMS DEBUG ===');

        if (itemsError) {
          console.error('Error creating inspection items:', itemsError);
          // Continue without pre-created items
        } else {
          console.log('Inspection items created successfully');
        }
      }
    }

    // Return both inspection and items for immediate use
    return { inspection, items: [] }; // Items will be loaded separately in InspectionPage
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
        .select(`
          *,
          report_recipient_id,
          template_items (
            id,
            template_id,
           template_id,
            type,
            label,
            required,
            options,
            report_enabled
          )
        `)
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
      items: itemsResponse.data.map(item => ({
        ...item,
        templateItem: item.template_items
      }))
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
  photoUrls?: string[],
  markedForReport?: boolean,
  reportRecipientId?: string
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
        markedForReport,
        reportRecipientId,
        updatedAt: new Date().toISOString(),
      };
      
      mockInspectionItemsState[itemIndex] = updatedItem;
      return updatedItem;
    }

    const updateData: any = { value };
    if (notes !== undefined) updateData.notes = notes;
    if (photoUrls !== undefined) updateData.photo_urls = photoUrls;
    if (markedForReport !== undefined) updateData.marked_for_report = markedForReport;
    if (reportRecipientId !== undefined) updateData.report_recipient_id = reportRecipientId;

    const { data, error } = await supabase
      .from('inspection_items')
      .update(updateData)
      .eq('id', inspectionItemId)
      .select('id, inspection_id, template_item_id, value, notes, photo_urls, marked_for_report, report_recipient_id, order_index, created_at, updated_at');

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data?.[0] || null;
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
    
    // Upload via custom storage API
    const uploadResult = await uploadFile(webpFile, 'photo', inspectionId, itemId);
    
    console.log('=== PHOTO UPLOAD RESULT ===');
    console.log('Upload result:', {
      fileUrl: uploadResult?.fileUrl,
      fileKey: uploadResult?.fileKey,
      metadataId: uploadResult?.metadataId
    });
    console.log('=== END PHOTO UPLOAD RESULT ===');
    
    if (!uploadResult) {
      throw new Error('Failed to upload photo');
    }
    
    return uploadResult.fileUrl;
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
  console.log('=== WEBP CONVERSION START ===');
  console.log('Original file details:', {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified
  });
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      console.log('Image loaded for WebP conversion:', {
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
            });
            
            console.log('WebP conversion successful:', {
              originalName: file.name,
              webpName: webpFile.name,
              originalType: file.type,
              webpType: webpFile.type,
              originalSize: file.size,
              webpSize: webpFile.size,
              sizeReduction: ((file.size - webpFile.size) / file.size * 100).toFixed(2) + '%'
            });
            
            // Log first 50 bytes of WebP file for validation
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer.slice(0, 50));
              const hexString = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ');
              console.log('WebP file header (first 50 bytes):', hexString);
              console.log('WebP signature check:', hexString.startsWith('52 49 46 46') ? 'VALID RIFF' : 'INVALID');
            };
            reader.readAsArrayBuffer(webpFile.slice(0, 50));
            
            console.log('=== WEBP CONVERSION END ===');
            resolve(webpFile);
          } else {
            console.error('WebP conversion failed: canvas.toBlob returned null');
            reject(new Error('Failed to convert image to WebP'));
          }
        }, 'image/webp', 0.8); // 80% quality
      } else {
        console.error('WebP conversion failed: could not get canvas context');
        reject(new Error('Failed to get canvas context'));
      }
    };
    
    img.onerror = (error) => {
      console.error('WebP conversion failed: image load error:', error);
      reject(new Error('Failed to load image for WebP conversion'));
    };
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

export async function deleteInspection(inspectionId: string): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Deleting mock inspection:', inspectionId);
      const inspectionIndex = mockInspectionsState.findIndex(i => i.id === inspectionId);
      if (inspectionIndex === -1) {
        throw new Error('Inspection not found');
      }
      
      mockInspectionsState.splice(inspectionIndex, 1);
      mockInspectionItemsState = mockInspectionItemsState.filter(item => item.inspectionId !== inspectionId);
      return true;
    }

    // First, get all files associated with this inspection for cleanup
    const { data: filesToDelete, error: filesError } = await supabase
      .from('file_metadata')
      .select('file_key')
      .eq('inspection_id', inspectionId);

    if (filesError) {
      console.error('Error fetching files for deletion:', filesError);
      // Continue with inspection deletion even if file cleanup fails
    }

    // Clean up files from MinIO storage
    if (filesToDelete && filesToDelete.length > 0) {
      const { deleteFile } = await import('./storage');
      
      for (const file of filesToDelete) {
        try {
          await deleteFile(file.file_key);
          console.log('Deleted file from storage:', file.file_key);
        } catch (fileError) {
          console.error('Error deleting file from storage:', file.file_key, fileError);
          // Continue with other files even if one fails
        }
      }
    }

    // Delete the inspection (cascade should handle inspection_items and reports)
    const { error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', inspectionId);

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return false;
      }
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting inspection:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}

export async function deleteIncompleteInspections(): Promise<{ deleted: number; errors: string[] }> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Cleaning up mock incomplete inspections');
      const incompleteCount = mockInspectionsState.filter(i => i.status === 'in_progress').length;
      mockInspectionsState = mockInspectionsState.filter(i => i.status !== 'in_progress');
      return { deleted: incompleteCount, errors: [] };
    }

    // Get all incomplete inspections for this admin
    const { data: incompleteInspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select(`
        id,
        properties!inner(admin_id)
      `)
      .eq('status', 'in_progress')
      .eq('properties.admin_id', (await supabase.from('admin').select('id').eq('owner_id', user.id).single()).data?.id);

    if (inspectionsError) {
      throw inspectionsError;
    }

    const errors: string[] = [];
    let deletedCount = 0;

    for (const inspection of incompleteInspections || []) {
      try {
        const success = await deleteInspection(inspection.id);
        if (success) {
          deletedCount++;
        }
      } catch (error: any) {
        errors.push(`Failed to delete inspection ${inspection.id}: ${error.message}`);
      }
    }

    return { deleted: deletedCount, errors };
  } catch (error: any) {
    console.error('Error cleaning up incomplete inspections:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return { deleted: 0, errors: ['Authentication failed'] };
    }
    
    throw error;
  }
}