import { supabase, devModeEnabled } from './supabase';
import { Report } from '../types';

export interface GetReportsFilters {
  searchTerm?: string;
  inspectionType?: string;
  propertyId?: string;
  limit?: number;
  offset?: number;
}

export async function getReports(filters: GetReportsFilters = {}): Promise<Report[]> {
  const { searchTerm, inspectionType, propertyId, limit = 50, offset = 0 } = filters;

  if (devModeEnabled()) {
    // Mock data for development
    const mockReports: Report[] = [
      {
        id: '1',
        inspectionId: 'inspection-1',
        reportUrl: '/mock-report-1.pdf',
        reportType: 'inspection',
        generatedAt: new Date().toISOString(),
        propertyName: 'Oceanview Apartment 2B',
        inspectionType: 'check_in',
        primaryContactName: 'John Smith',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        inspectionId: 'inspection-2',
        reportUrl: '/mock-report-2.pdf',
        reportType: 'inspection',
        generatedAt: new Date().toISOString(),
        propertyName: 'Downtown Loft 5A',
        inspectionType: 'check_out',
        primaryContactName: 'Jane Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Filter mock data based on search term
    if (searchTerm) {
      return mockReports.filter(report =>
        report.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.primaryContactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.inspectionType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return mockReports;
  }

  try {
    let query = supabase
      .from('reports')
      .select(`
        id,
        inspection_id,
        report_url,
        report_type,
        generated_at,
        created_at,
        updated_at,
        inspections!inner (
          id,
          inspection_type,
          primary_contact_name,
          properties!inner (
            id,
            name
          )
        )
      `)
      .order('generated_at', { ascending: false });

    // Apply filters
    if (propertyId) {
      query = query.eq('inspections.property_id', propertyId);
    }

    if (inspectionType) {
      query = query.eq('inspections.inspection_type', inspectionType);
    }

    // Apply search term filter
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      query = query.or(`inspections.properties.name.ilike.%${searchTerm}%,inspections.primary_contact_name.ilike.%${searchTerm}%,inspections.inspector_name.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }

    // Transform the data to match our Report type
    return (data || []).map((item: any) => ({
      id: item.id,
      inspectionId: item.inspection_id,
      reportUrl: item.report_url,
      reportType: item.report_type,
      generatedAt: item.generated_at,
      propertyName: item.inspections?.properties?.name,
      inspectionType: item.inspections?.inspection_type,
      primaryContactName: item.inspections?.primary_contact_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getReports:', error);
    throw error;
  }
}

export async function generateInspectionReport(inspectionId: string): Promise<string> {
  // This function would contain the PDF generation logic
  // For now, returning a placeholder
  return `/reports/${inspectionId}.pdf`;
}