import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';

// Types for property checklists
export interface PropertyChecklist {
  id: string;
  propertyId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  templates?: PropertyChecklistTemplate[];
}

export interface PropertyChecklistTemplate {
  id: string;
  propertyChecklistId: string;
  templateId: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
    description?: string;
    itemCount?: number;
  };
}

// Mock data for dev mode
const MOCK_PROPERTY_CHECKLISTS: PropertyChecklist[] = [
  {
    id: 'mock-checklist-1',
    propertyId: 'mock-property-1',
    name: 'Oceanview Apartment Checklist',
    description: 'Complete inspection checklist for oceanview apartment',
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    templates: [
      {
        id: 'mock-checklist-template-1',
        propertyChecklistId: 'mock-checklist-1',
        templateId: 'mock-template-1',
        orderIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        template: {
          id: 'mock-template-1',
          name: 'Kitchen Inspection',
          description: 'Comprehensive kitchen inspection checklist',
          itemCount: 8,
        },
      },
      {
        id: 'mock-checklist-template-2',
        propertyChecklistId: 'mock-checklist-1',
        templateId: 'mock-template-2',
        orderIndex: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        template: {
          id: 'mock-template-2',
          name: 'Bathroom Check',
          description: 'Standard bathroom inspection template',
          itemCount: 6,
        },
      },
    ],
  },
];

let mockPropertyChecklistsState = [...MOCK_PROPERTY_CHECKLISTS];

export async function getPropertyChecklist(propertyId: string): Promise<PropertyChecklist | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Getting mock property checklist for property:', propertyId);
      const checklist = mockPropertyChecklistsState.find(c => c.propertyId === propertyId && c.isActive);
      return checklist || null;
    }

    const { data: checklist, error } = await supabase
      .from('property_checklists')
      .select(`
        *,
        property_checklist_templates (
          *,
          templates (
            id,
            name,
            description,
            template_items(count)
          )
        )
      `)
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    if (!checklist) {
      return null;
    }

    // Transform the data to match our interface
    const transformedChecklist: PropertyChecklist = {
      id: checklist.id,
      propertyId: checklist.property_id,
      name: checklist.name,
      description: checklist.description,
      isActive: checklist.is_active,
      createdAt: checklist.created_at,
      updatedAt: checklist.updated_at,
      templates: checklist.property_checklist_templates
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((pct: any) => ({
          id: pct.id,
          propertyChecklistId: pct.property_checklist_id,
          templateId: pct.template_id,
          orderIndex: pct.order_index,
          createdAt: pct.created_at,
          updatedAt: pct.updated_at,
          template: pct.templates ? {
            id: pct.templates.id,
            name: pct.templates.name,
            description: pct.templates.description,
            itemCount: pct.templates.template_items?.[0]?.count || 0,
          } : undefined,
        })) || [],
    };

    return transformedChecklist;
  } catch (error: any) {
    console.error('Error fetching property checklist:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function createPropertyChecklist(checklistData: {
  propertyId: string;
  name: string;
  description?: string;
  templateIds: string[];
}): Promise<PropertyChecklist | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock property checklist');
      const newChecklist: PropertyChecklist = {
        id: `mock-checklist-${Date.now()}`,
        propertyId: checklistData.propertyId,
        name: checklistData.name,
        description: checklistData.description,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templates: checklistData.templateIds.map((templateId, index) => ({
          id: `mock-checklist-template-${Date.now()}-${index}`,
          propertyChecklistId: `mock-checklist-${Date.now()}`,
          templateId,
          orderIndex: index + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          template: {
            id: templateId,
            name: `Template ${templateId}`,
            description: 'Mock template description',
            itemCount: Math.floor(Math.random() * 10) + 1,
          },
        })),
      };
      
      mockPropertyChecklistsState.push(newChecklist);
      return newChecklist;
    }

    // Start a transaction by creating the checklist first
    const { data: checklist, error: checklistError } = await supabase
      .from('property_checklists')
      .insert([{
        property_id: checklistData.propertyId,
        name: checklistData.name,
        description: checklistData.description,
        is_active: true,
      }])
      .select()
      .single();

    if (checklistError) {
      if (checklistError.message?.includes('user_not_found') || checklistError.message?.includes('JWT')) {
        await handleAuthError(checklistError);
        return null;
      }
      throw checklistError;
    }

    // Create the template associations with proper ordering
    if (checklistData.templateIds.length > 0) {
      const templateAssociations = checklistData.templateIds.map((templateId, index) => ({
        property_checklist_id: checklist.id,
        template_id: templateId,
        order_index: index + 1,
      }));

      const { error: templatesError } = await supabase
        .from('property_checklist_templates')
        .insert(templateAssociations);

      if (templatesError) {
        // If template insertion fails, clean up the checklist
        await supabase
          .from('property_checklists')
          .delete()
          .eq('id', checklist.id);
        
        if (templatesError.message?.includes('user_not_found') || templatesError.message?.includes('JWT')) {
          await handleAuthError(templatesError);
          return null;
        }
        throw templatesError;
      }
    }

    // Fetch the complete checklist with templates
    return await getPropertyChecklist(checklistData.propertyId);
  } catch (error: any) {
    console.error('Error creating property checklist:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function updatePropertyChecklist(
  checklistId: string,
  checklistData: {
    name?: string;
    description?: string;
    templateIds?: string[];
  }
): Promise<PropertyChecklist | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Updating mock property checklist:', checklistId);
      const checklistIndex = mockPropertyChecklistsState.findIndex(c => c.id === checklistId);
      if (checklistIndex === -1) {
        throw new Error('Checklist not found');
      }
      
      const existingChecklist = mockPropertyChecklistsState[checklistIndex];
      const updatedChecklist: PropertyChecklist = {
        ...existingChecklist,
        name: checklistData.name || existingChecklist.name,
        description: checklistData.description !== undefined ? checklistData.description : existingChecklist.description,
        updatedAt: new Date().toISOString(),
      };
      
      if (checklistData.templateIds) {
        updatedChecklist.templates = checklistData.templateIds.map((templateId, index) => ({
          id: `mock-checklist-template-${Date.now()}-${index}`,
          propertyChecklistId: checklistId,
          templateId,
          orderIndex: index + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          template: {
            id: templateId,
            name: `Template ${templateId}`,
            description: 'Mock template description',
            itemCount: Math.floor(Math.random() * 10) + 1,
          },
        }));
      }
      
      mockPropertyChecklistsState[checklistIndex] = updatedChecklist;
      return updatedChecklist;
    }

    // Update the checklist basic info
    const updateData: any = {};
    if (checklistData.name !== undefined) updateData.name = checklistData.name;
    if (checklistData.description !== undefined) updateData.description = checklistData.description;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('property_checklists')
        .update(updateData)
        .eq('id', checklistId);

      if (updateError) {
        if (updateError.message?.includes('user_not_found') || updateError.message?.includes('JWT')) {
          await handleAuthError(updateError);
          return null;
        }
        throw updateError;
      }
    }

    // Update template associations if provided
    if (checklistData.templateIds) {
      // Delete existing template associations
      const { error: deleteError } = await supabase
        .from('property_checklist_templates')
        .delete()
        .eq('property_checklist_id', checklistId);

      if (deleteError) {
        if (deleteError.message?.includes('user_not_found') || deleteError.message?.includes('JWT')) {
          await handleAuthError(deleteError);
          return null;
        }
        throw deleteError;
      }

      // Insert new template associations
      if (checklistData.templateIds.length > 0) {
        const templateAssociations = checklistData.templateIds.map((templateId, index) => ({
          property_checklist_id: checklistId,
          template_id: templateId,
          order_index: index + 1,
        }));

        const { error: insertError } = await supabase
          .from('property_checklist_templates')
          .insert(templateAssociations);

        if (insertError) {
          if (insertError.message?.includes('user_not_found') || insertError.message?.includes('JWT')) {
            await handleAuthError(insertError);
            return null;
          }
          throw insertError;
        }
      }
    }

    // Get the updated checklist
    const { data: updatedChecklist, error: fetchError } = await supabase
      .from('property_checklists')
      .select('property_id')
      .eq('id', checklistId)
      .single();

    if (fetchError) {
      if (fetchError.message?.includes('user_not_found') || fetchError.message?.includes('JWT')) {
        await handleAuthError(fetchError);
        return null;
      }
      throw fetchError;
    }

    return await getPropertyChecklist(updatedChecklist.property_id);
  } catch (error: any) {
    console.error('Error updating property checklist:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function deletePropertyChecklist(checklistId: string): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Deleting mock property checklist:', checklistId);
      const checklistIndex = mockPropertyChecklistsState.findIndex(c => c.id === checklistId);
      if (checklistIndex === -1) {
        throw new Error('Checklist not found');
      }
      
      mockPropertyChecklistsState.splice(checklistIndex, 1);
      return true;
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('property_checklists')
      .update({ is_active: false })
      .eq('id', checklistId);

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return false;
      }
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting property checklist:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}

export async function reorderChecklistTemplates(
  checklistId: string,
  templateOrders: { templateId: string; orderIndex: number }[]
): Promise<boolean> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Reordering mock checklist templates');
      const checklistIndex = mockPropertyChecklistsState.findIndex(c => c.id === checklistId);
      if (checklistIndex === -1) {
        throw new Error('Checklist not found');
      }
      
      const checklist = mockPropertyChecklistsState[checklistIndex];
      if (checklist.templates) {
        checklist.templates.forEach(template => {
          const newOrder = templateOrders.find(to => to.templateId === template.templateId);
          if (newOrder) {
            template.orderIndex = newOrder.orderIndex;
          }
        });
        
        checklist.templates.sort((a, b) => a.orderIndex - b.orderIndex);
        checklist.updatedAt = new Date().toISOString();
      }
      
      return true;
    }

    // Update each template's order_index
    for (const templateOrder of templateOrders) {
      const { error } = await supabase
        .from('property_checklist_templates')
        .update({ order_index: templateOrder.orderIndex })
        .eq('property_checklist_id', checklistId)
        .eq('template_id', templateOrder.templateId);

      if (error) {
        if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
          await handleAuthError(error);
          return false;
        }
        throw error;
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error reordering checklist templates:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}