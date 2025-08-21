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
            order,
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
          // Sort template items by their order before creating inspection items
          const sortedTemplateItems = template.template_items.sort((a, b) => a.order - b.order);
          for (const templateItem of sortedTemplateItems) {
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

    // First fetch the inspection to get the property_checklist_id
    const inspectionResponse = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (inspectionResponse.error) {
      if (inspectionResponse.error.message?.includes('user_not_found') || inspectionResponse.error.message?.includes('JWT')) {
        await handleAuthError(inspectionResponse.error);
        return null;
      }
      throw inspectionResponse.error;
    }

    // Now fetch items and checklist templates concurrently
    const [itemsResponse, checklistResponse] = await Promise.all([
      supabase
        .from('inspection_items')
        .select(`
          *,
          report_recipient_id,
          template_items (
            id,
            template_id,
            type,
            label,
            required,
            options,
            report_enabled
          )
        `)
        .eq('inspection_id', inspectionId)
        .order('order_index'),
      // Fetch the checklist templates associated with this inspection
      supabase
        .from('property_checklists')
        .select(`
          property_checklist_templates (
            template_id,
            order_index,
            templates (
              id,
              name,
              description
            )
          )
        `)
        .eq('id', inspectionResponse.data.property_checklist_id)
        .single()
    ]);

    if (itemsResponse.error) {
      if (itemsResponse.error.message?.includes('user_not_found') || itemsResponse.error.message?.includes('JWT')) {
        await handleAuthError(itemsResponse.error);
        return null;
      }
      throw itemsResponse.error;
    }

    if (checklistResponse.error) {
      console.error('Error fetching checklist templates:', checklistResponse.error);
      // Do not throw, as inspection items might still be valid
    }

    return {
      inspection: inspectionResponse.data,
      items: itemsResponse.data.map(item => ({
        ...item,
        templateItem: item.template_items
      })),
      checklistTemplates: checklistResponse.data?.property_checklist_templates || []
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

    // Check storage capacity before uploading
    if (!devModeEnabled()) {
      const storageUsage = await getStorageUsage();
      if (storageUsage && isStorageAtLimit(storageUsage.currentUsage, storageUsage.quota)) {
        throw new Error('Storage limit reached. Cannot upload photos. Please upgrade your plan or delete files.');
      }
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock photo upload for inspection:', inspectionId);
      // Return a mock URL
      return `https://example.com/mock-photo-${Date.now()}.jpeg`;
    }

    // Optimize image (client-side conversion to JPEG)
    const { resizeAndOptimizeImage } = await import('../lib/utils');
    const optimizedFile = await resizeAndOptimizeImage(file, 800, 600, 0.8);
    
    // Upload via custom storage API
    const uploadResult = await uploadFile(optimizedFile, 'photo', inspectionId, itemId);
    
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
      .select(`*, inspection_items(id)`) // Select inspection and a minimal indicator of items
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Filter the results: show completed OR (in_progress AND has_items)
    const filteredData = data.filter(inspection => {
      if (inspection.status === 'completed') {
        return true;
      }
      if (inspection.status === 'in_progress') {
        // Check if the inspection_items array is not empty (meaning it has saved items)
        return inspection.inspection_items && inspection.inspection_items.length > 0;
      }
      return false; // Don't show other statuses or empty in_progress inspections
    });
    return filteredData.map(i => { const { inspection_items, ...rest } = i; return rest; });
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
      // Calculate 7 days ago for dev mode
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oldIncompleteInspections = mockInspectionsState.filter(i => 
        i.status === 'in_progress' && new Date(i.createdAt) <= sevenDaysAgo
      );
      const incompleteCount = oldIncompleteInspections.length;
      mockInspectionsState = mockInspectionsState.filter(i => 
        !(i.status === 'in_progress' && new Date(i.createdAt) <= sevenDaysAgo)
      );
      return { deleted: incompleteCount, errors: [] };
    }

    // Calculate 7 days ago timestamp
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    
    console.log('Deleting incomplete inspections older than:', sevenDaysAgoISO);

    // Get all incomplete inspections for this admin
    const { data: incompleteInspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select(`
        id,
        properties!inner(admin_id)
      `)
      .eq('status', 'in_progress')
      .lte('created_at', sevenDaysAgoISO)
      .eq('properties.admin_id', (await supabase.from('admin').select('id').eq('owner_id', user.id).single()).data?.id);

    if (inspectionsError) {
      throw inspectionsError;
    }

    console.log(`Found ${incompleteInspections?.length || 0} incomplete inspections older than 7 days to delete`);

    const errors: string[] = [];
    let deletedCount = 0;

    for (const inspection of incompleteInspections || []) {
      try {
        console.log(`Deleting old incomplete inspection: ${inspection.id}`);
        const success = await deleteInspection(inspection.id);
        if (success) {
          deletedCount++;
          console.log(`Successfully deleted inspection: ${inspection.id}`);
        }
      } catch (error: any) {
        console.error(`Failed to delete inspection ${inspection.id}:`, error);
        errors.push(`Failed to delete inspection ${inspection.id}: ${error.message}`);
      }
    }

    console.log(`Cleanup completed: ${deletedCount} inspections deleted, ${errors.length} errors`);
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