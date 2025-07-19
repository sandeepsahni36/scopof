import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { Property } from '../types';

// Mock data for dev mode
const MOCK_PROPERTIES: Property[] = [
  {
    id: 'mock-property-1',
    companyId: 'dev-company-id',
    name: 'Oceanview Apartment 2B',
    address: '123 Beach Boulevard, Miami, FL 33139',
    type: 'apartment',
    bedrooms: '2',
    bathrooms: '2',
    notes: 'Beautiful oceanfront property with stunning views',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-property-2',
    companyId: 'dev-company-id',
    name: 'Downtown Loft 5A',
    address: '456 Main Street, Downtown, FL 33101',
    type: 'condo',
    bedrooms: '1',
    bathrooms: '1',
    notes: 'Modern loft in the heart of downtown',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-property-3',
    companyId: 'dev-company-id',
    name: 'Mountain View Villa',
    address: '789 Highland Drive, Mountain View, FL 33456',
    type: 'villa',
    bedrooms: '4',
    bathrooms: '3',
    notes: 'Luxury villa with mountain views and private pool',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockPropertiesState = [...MOCK_PROPERTIES];

export async function getProperties(searchTerm?: string, filters?: {
  type?: string;
  bedrooms?: string;
  bathrooms?: string;
}) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock properties');
      let filteredProperties = [...mockPropertiesState];

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredProperties = filteredProperties.filter(property =>
          property.name.toLowerCase().includes(searchLower) ||
          property.address.toLowerCase().includes(searchLower)
        );
      }

      // Apply type filter
      if (filters?.type && filters.type !== 'all') {
        filteredProperties = filteredProperties.filter(property => property.type === filters.type);
      }

      // Apply bedrooms filter
      if (filters?.bedrooms && filters.bedrooms !== 'all') {
        filteredProperties = filteredProperties.filter(property => property.bedrooms === filters.bedrooms);
      }

      // Apply bathrooms filter
      if (filters?.bathrooms && filters.bathrooms !== 'all') {
        filteredProperties = filteredProperties.filter(property => property.bathrooms === filters.bathrooms);
      }

      return filteredProperties;
    }

    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply search filter
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
    }

    // Apply type filter
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    // Apply bedrooms filter
    if (filters?.bedrooms && filters.bedrooms !== 'all') {
      query = query.eq('bedrooms', filters.bedrooms);
    }

    // Apply bathrooms filter
    if (filters?.bathrooms && filters.bathrooms !== 'all') {
      query = query.eq('bathrooms', filters.bathrooms);
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
    console.error('Error fetching properties:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getProperty(id: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock property for ID:', id);
      const property = mockPropertiesState.find(p => p.id === id);
      if (!property) {
        throw new Error('Property not found');
      }
      return property;
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
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
    console.error('Error fetching property:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function createProperty(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Creating mock property');
      const newProperty: Property = {
        id: `mock-property-${Date.now()}`,
        companyId: 'dev-company-id',
        name: propertyData.name,
        address: propertyData.address,
        type: propertyData.type,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        notes: propertyData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockPropertiesState.push(newProperty);
      return newProperty;
    }

    // Get user's admin ID
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (adminError || !adminData) {
      throw new Error('Admin access required to create properties');
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([{
        admin_id: adminData.id,
        name: propertyData.name,
        address: propertyData.address,
        type: propertyData.type,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        notes: propertyData.notes,
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
    console.error('Error creating property:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function updateProperty(id: string, propertyData: Partial<Omit<Property, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Updating mock property:', id);
      const propertyIndex = mockPropertiesState.findIndex(p => p.id === id);
      if (propertyIndex === -1) {
        throw new Error('Property not found');
      }
      
      const updatedProperty = {
        ...mockPropertiesState[propertyIndex],
        ...propertyData,
        updatedAt: new Date().toISOString(),
      };
      
      mockPropertiesState[propertyIndex] = updatedProperty;
      return updatedProperty;
    }

    const { data, error } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('id', id)
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
    console.error('Error updating property:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function deleteProperty(id: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Deleting mock property:', id);
      const propertyIndex = mockPropertiesState.findIndex(p => p.id === id);
      if (propertyIndex === -1) {
        throw new Error('Property not found');
      }
      
      mockPropertiesState.splice(propertyIndex, 1);
      return true;
    }

    const { error } = await supabase
      .from('properties')
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
    console.error('Error deleting property:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return false;
    }
    
    throw error;
  }
}

export async function checkPropertyLimit() {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock property limits');
      return {
        currentCount: mockPropertiesState.length,
        limit: 45, // Professional tier limit for dev mode
        canCreate: mockPropertiesState.length < 45,
        tier: 'professional'
      };
    }

    // Get user's admin data and current property count
    const [adminResponse, propertiesResponse] = await Promise.all([
      supabase
        .from('admin')
        .select('subscription_tier')
        .eq('owner_id', user.id)
        .single(),
      supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .eq('admin_id', (await supabase.from('admin').select('id').eq('owner_id', user.id).single()).data?.id)
    ]);

    if (adminResponse.error || propertiesResponse.error) {
      throw new Error('Failed to check property limits');
    }

    const tier = adminResponse.data.subscription_tier;
    const currentCount = propertiesResponse.count || 0;

    // Define tier limits
    const limits = {
      starter: 10,
      professional: 45,
      enterprise: Infinity
    };

    const limit = limits[tier as keyof typeof limits] || 10;
    const canCreate = currentCount < limit;

    return {
      currentCount,
      limit,
      canCreate,
      tier
    };
  } catch (error: any) {
    console.error('Error checking property limit:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}