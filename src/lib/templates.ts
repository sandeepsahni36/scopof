import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { Template, TemplateCategory, TemplateItem, TemplateItemType } from '../types';

// Mock data for dev mode
const MOCK_CATEGORIES: TemplateCategory[] = [
  {
    id: 'mock-cat-1',
    adminId: 'dev-company-id',
    name: 'Kitchen',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cat-2',
    adminId: 'dev-company-id',
    name: 'Bathroom',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cat-3',
    adminId: 'dev-company-id',
    name: 'Living Room',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cat-4',
    adminId: 'dev-company-id',
    name: 'Bedroom',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cat-5',
    adminId: 'dev-company-id',
    name: 'Exterior',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_TEMPLATES: Template[] = [
  {
    id: 'mock-template-1',
    adminId: 'dev-company-id',
    categoryId: 'mock-cat-1',
    name: 'Kitchen Inspection',
    description: 'Comprehensive kitchen inspection checklist',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-template-2',
    adminId: 'dev-company-id',
    categoryId: 'mock-cat-2',
    name: 'Bathroom Check',
    description: 'Standard bathroom inspection template',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-template-3',
    adminId: 'dev-company-id',
    categoryId: 'mock-cat-3',
    name: 'Living Room Assessment',
    description: 'Living room and common area inspection',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_TEMPLATE_ITEMS: TemplateItem[] = [
  // Kitchen template items
  {
    id: 'mock-item-1',
    templateId: 'mock-template-1',
    type: 'single_choice',
    label: 'Appliances working properly',
    required: true,
    options: ['Yes', 'No', 'Needs Repair'],
    reportEnabled: true,
    maintenanceEmail: 'maintenance@example.com',
    reportRecipientId: 'mock-team-1',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-item-2',
    templateId: 'mock-template-1',
    type: 'photo',
    label: 'Kitchen countertops condition',
    required: true,
    options: null,
    reportEnabled: false,
    maintenanceEmail: null,
    reportRecipientId: null,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-item-3',
    templateId: 'mock-template-1',
    type: 'text',
    label: 'Additional kitchen notes',
    required: false,
    options: null,
    reportEnabled: false,
    maintenanceEmail: null,
    reportRecipientId: null,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Bathroom template items
  {
    id: 'mock-item-4',
    templateId: 'mock-template-2',
    type: 'multiple_choice',
    label: 'Bathroom fixtures condition',
    required: true,
    options: ['Toilet', 'Sink', 'Shower', 'Bathtub'],
    reportEnabled: true,
    maintenanceEmail: 'plumbing@example.com',
    reportRecipientId: 'mock-team-2',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-item-5',
    templateId: 'mock-template-2',
    type: 'photo',
    label: 'Bathroom cleanliness',
    required: true,
    options: null,
    reportEnabled: false,
    maintenanceEmail: null,
    reportRecipientId: null,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// State management for mock data
let mockCategoriesState = [...MOCK_CATEGORIES];
let mockTemplatesState = [...MOCK_TEMPLATES];
let mockTemplateItemsState = [...MOCK_TEMPLATE_ITEMS];

export async function getTemplateCategories() {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock categories');
      return mockCategoriesState;
    }

    const { data, error } = await supabase
      .from('template_categories')
      .select('*')
      .order('name');

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error fetching template categories:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function createTemplateCategory(name: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock category');
      const newCategory: TemplateCategory = {
        id: `mock-cat-${Date.now()}`,
        adminId: 'dev-company-id',
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockCategoriesState.push(newCategory);
      return newCategory;
    }

    const { data, error } = await supabase
      .from('template_categories')
      .insert([{ name }])
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
    console.error('Error creating template category:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getTemplates(searchTerm?: string, categoryId?: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock templates');
      let filteredTemplates = [...mockTemplatesState];

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredTemplates = filteredTemplates.filter(template =>
          template.name.toLowerCase().includes(searchLower) ||
          (template.description && template.description.toLowerCase().includes(searchLower))
        );
      }

      // Apply category filter
      if (categoryId) {
        filteredTemplates = filteredTemplates.filter(template => template.categoryId === categoryId);
      }

      return filteredTemplates;
    }

    // Build query for production
    let query = supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply search filter
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Apply category filter
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getTemplate(id: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock template for ID:', id);
      const template = mockTemplatesState.find(t => t.id === id);
      if (!template) {
        throw new Error('Template not found');
      }
      
      const items = mockTemplateItemsState
        .filter(item => item.templateId === id)
        .sort((a, b) => a.order - b.order);
      
      return { template, items };
    }

    const [templateResponse, itemsResponse] = await Promise.all([
      supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('template_items')
        .select('*')
        .eq('template_id', id)
        .order('order')
    ]);

    if (templateResponse.error) {
      if (templateResponse.error.message?.includes('user_not_found') || templateResponse.error.message?.includes('JWT')) {
        await handleAuthError(templateResponse.error);
        return null;
      }
      throw templateResponse.error;
    }

    if (itemsResponse.error) {
      if (itemsResponse.error.message?.includes('user_not_found') || itemsResponse.error.message?.includes('JWT')) {
        await handleAuthError(itemsResponse.error);
        return null;
      }
      throw itemsResponse.error;
    }

    // Transform database items to flat structure
    const items: TemplateItem[] = itemsResponse.data
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        id: item.id,
        templateId: item.template_id,
        type: item.type,
        label: item.label,
        required: item.required,
        options: item.options,
        reportEnabled: item.report_enabled,
        maintenanceEmail: item.maintenance_email,
        reportRecipientId: item.report_recipient_id,
        order: item.order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

    return {
      template: templateResponse.data,
      items
    };
  } catch (error: any) {
    console.error('Error fetching template:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

function buildItemHierarchy(flatItems: any[]): TemplateItem[] {
  const itemMap = new Map<string, TemplateItem>();
  const rootItems: TemplateItem[] = [];

  // First pass: create all items
  flatItems.forEach(item => {
    const templateItem: TemplateItem = {
      id: item.id,
      templateId: item.template_id,
      parentId: item.parent_id,
      type: item.type,
      label: item.label,
      sectionName: item.section_name,
      required: item.required,
      options: item.options,
      reportEnabled: item.report_enabled,
      maintenanceEmail: item.maintenance_email,
      reportRecipientId: item.report_recipient_id,
      order: item.order,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      children: [],
    };
    itemMap.set(item.id, templateItem);
  });

  // Second pass: build hierarchy
  itemMap.forEach(item => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      }
    } else {
      rootItems.push(item);
    }
  });

  // Sort children within each parent
  const sortItems = (items: TemplateItem[]) => {
    items.sort((a, b) => a.order - b.order);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortItems(item.children);
      }
    });
  };

  sortItems(rootItems);
  return rootItems;
}

export async function createTemplate(
  templateData: { name: string; description?: string },
  items: Array<{
    id: string;
    type: TemplateItemType;
    label: string;
    required: boolean;
    options?: string[] | RatingOption[];
    reportEnabled: boolean;
    reportRecipientId?: string;
    order: number;
  }>
) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    console.log('=== CREATE TEMPLATE DEBUG START ===');
    console.log('Template data:', templateData);
    console.log('Items array received:', items);
    console.log('Items count:', items.length);
    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock template');
      const newTemplate: Template = {
        id: `mock-template-${Date.now()}`,
        adminId: 'dev-company-id',
        categoryId: null,
        name: templateData.name,
        description: templateData.description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockTemplatesState.push(newTemplate);
      
      // Create template items
      const newItems: TemplateItem[] = items.map((item, index) => ({
        id: `mock-item-${Date.now()}-${index}`,
        templateId: newTemplate.id,
        type: item.type,
        label: item.label,
        required: item.required,
        options: item.options || null,
        reportEnabled: item.reportEnabled,
        maintenanceEmail: null, // Deprecated field
        reportRecipientId: item.reportRecipientId || null,
        order: item.order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      mockTemplateItemsState.push(...newItems);
      
      return { template: newTemplate, items: newItems };
    }

    // Get the admin_id for the current user
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error('Admin account not found for current user');
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert([{
        admin_id: adminData.id,
        name: templateData.name,
        category_id: null, // No longer using categories
        description: templateData.description,
      }])
      .select()
      .single();

    if (templateError) {
      if (templateError.message?.includes('user_not_found') || templateError.message?.includes('JWT')) {
        await handleAuthError(templateError);
        return null;
      }
      throw templateError;
    }

    console.log('Template created successfully:', template);
    // Create template items with hierarchy support
    if (items.length > 0) {
      // Insert items in order
      const templateItems = [];
      
      for (const item of items) {
        const { data: insertedItem, error: itemError } = await supabase
          .from('template_items')
          .insert({
            template_id: template.id,
            type: item.type,
            label: item.label,
            required: item.required,
            options: item.options,
            report_enabled: item.reportEnabled,
            report_recipient_id: item.reportRecipientId || null,
            order: item.order,
          })
          .select()
          .single();
        
        if (itemError) {
          console.error('Error inserting item:', itemError);
          if (itemError.message?.includes('user_not_found') || itemError.message?.includes('JWT')) {
            await handleAuthError(itemError);
            return null;
          }
          throw itemError;
        }
        
        templateItems.push(insertedItem);
      }

      console.log('=== CREATE TEMPLATE DEBUG END ===');

      return { template, items: templateItems };
    }

    console.log('No items to create, returning template only');
    console.log('=== CREATE TEMPLATE DEBUG END ===');
    return { template, items: [] };
  } catch (error: any) {
    console.error('Error creating template:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function updateTemplate(
  id: string,
  templateData: { name: string; description?: string },
  items: Array<{
    id: string;
    type: TemplateItemType;
    label: string;
    required: boolean;
    options?: string[] | RatingOption[];
    reportEnabled: boolean;
    reportRecipientId?: string;
    order: number;
  }>
) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    console.log('=== UPDATE TEMPLATE DEBUG START ===');
    console.log('Template ID:', id);
    console.log('Template data:', templateData);
    console.log('Items array received:', items);
    console.log('Items count:', items.length);
    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Updating mock template:', id);
      const templateIndex = mockTemplatesState.findIndex(t => t.id === id);
      if (templateIndex === -1) {
        throw new Error('Template not found');
      }
      
      const updatedTemplate = {
        ...mockTemplatesState[templateIndex],
        name: templateData.name,
        categoryId: null,
        description: templateData.description || null,
        updatedAt: new Date().toISOString(),
      };
      
      mockTemplatesState[templateIndex] = updatedTemplate;
      
      // Remove old items
      mockTemplateItemsState = mockTemplateItemsState.filter(item => item.templateId !== id);
      
      // Add new items
      const newItems: TemplateItem[] = items.map((item, index) => ({
        id: `mock-item-${Date.now()}-${index}`,
        templateId: id,
        type: item.type,
        label: item.label,
        required: item.required,
        options: item.options || null,
        reportEnabled: item.reportEnabled,
        maintenanceEmail: null, // Deprecated field
        reportRecipientId: item.reportRecipientId || null,
        order: item.order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      mockTemplateItemsState.push(...newItems);
      
      return { template: updatedTemplate, items: newItems };
    }

    // Update template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .update({
        name: templateData.name,
        category_id: null, // No longer using categories
        description: templateData.description,
      })
      .eq('id', id)
      .select()
      .single();

    if (templateError) {
      if (templateError.message?.includes('user_not_found') || templateError.message?.includes('JWT')) {
        await handleAuthError(templateError);
        return null;
      }
      throw templateError;
    }

    console.log('Template updated successfully:', template);
    // Delete existing items
    console.log('Deleting existing template items...');
    const { error: deleteError } = await supabase
      .from('template_items')
      .delete()
      .eq('template_id', id);

    if (deleteError) {
      console.error('Error deleting existing items:', deleteError);
      if (deleteError.message?.includes('user_not_found') || deleteError.message?.includes('JWT')) {
        await handleAuthError(deleteError);
        return null;
      }
      throw deleteError;
    }

    console.log('Existing items deleted successfully');
    // Create new items with hierarchy support
    if (items.length > 0) {
      // Insert items in order
      const templateItems = [];
      
      for (const item of items) {
        const { data: insertedItem, error: itemError } = await supabase
          .from('template_items')
          .insert({
            template_id: id,
            type: item.type,
            label: item.label,
            required: item.required,
            options: item.options,
            report_enabled: item.reportEnabled,
            report_recipient_id: item.reportRecipientId || null,
            order: item.order,
          })
          .select()
          .single();
        
        if (itemError) {
          console.error('Error inserting item:', itemError);
          if (itemError.message?.includes('user_not_found') || itemError.message?.includes('JWT')) {
            await handleAuthError(itemError);
            return null;
          }
          throw itemError;
        }
        
        templateItems.push(insertedItem);
      }

      console.log('=== UPDATE TEMPLATE DEBUG END ===');

      return { template, items: templateItems };
    }

    console.log('No items to create, returning template only');
    console.log('=== UPDATE TEMPLATE DEBUG END ===');
    return { template, items: [] };
  } catch (error: any) {
    console.error('Error updating template:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function deleteTemplate(id: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Deleting mock template:', id);
      const templateIndex = mockTemplatesState.findIndex(t => t.id === id);
      if (templateIndex === -1) {
        throw new Error('Template not found');
      }
      
      mockTemplatesState.splice(templateIndex, 1);
      mockTemplateItemsState = mockTemplateItemsState.filter(item => item.templateId !== id);
      
      return true;
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return false;
      }
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting template:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}