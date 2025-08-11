import { supabase } from './supabase';

export interface Report {
  id: string;
  inspection_id: string;
  report_url: string;
  report_type: string;
  generated_at: string;
  property_name?: string;
  inspection_type?: string;
  file_key?: string;
}

export async function getReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('file_metadata')
      .select(`
        id,
        file_key,
        file_name,
        created_at,
        inspection_id,
        inspections!inner(
          id,
          inspection_type,
          property_id,
          properties!inner(
            id,
            name
          )
        )
      `)
      .eq('file_type', 'report')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      throw new Error('Failed to fetch reports');
    }

    // Transform the data to match the Report interface
    const reports: Report[] = (data || []).map((item: any) => ({
      id: item.id,
      inspection_id: item.inspection_id,
      report_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-api/download/${item.file_key}`,
      report_type: item.file_name?.replace('.pdf', '') || 'Inspection',
      generated_at: item.created_at,
      property_name: item.inspections?.properties?.name,
      inspection_type: item.inspections?.inspection_type,
      file_key: item.file_key,
    }));

    return reports;
  } catch (error) {
    console.error('Error in getReports:', error);
    throw error;
  }
}

export async function generateInspectionReport(inspectionId: string): Promise<string> {
  try {
    // This is a placeholder for PDF generation
    // In a real implementation, you would generate the PDF here
    // and upload it to storage, then return the file key
    
    const mockFileKey = `reports/inspection-${inspectionId}-${Date.now()}.pdf`;
    
    // Create a mock file metadata entry
    const { data, error } = await supabase
      .from('file_metadata')
      .insert({
        file_key: mockFileKey,
        file_name: `inspection-report-${Date.now()}.pdf`,
        file_type: 'report',
        file_size: 1024000, // 1MB mock size
        mime_type: 'application/pdf',
        inspection_id: inspectionId,
        s3_bucket: 'reports',
        s3_region: 'us-east-1',
        upload_status: 'completed'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report metadata:', error);
      throw new Error('Failed to create report metadata');
    }

    return mockFileKey;
  } catch (error) {
    console.error('Error generating inspection report:', error);
    throw error;
  }
}