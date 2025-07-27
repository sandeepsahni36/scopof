import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { uploadFile, checkStorageQuota } from './storage';
import jsPDF from 'jspdf';

export async function generateInspectionReport(reportData: {
  inspection: any;
  rooms: any[];
  primaryContactName: string;
  inspectorName: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  primaryContactSignature?: string;
  inspectorSignature?: string;
}): Promise<string | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Generating mock PDF report');
      return generateMockPDFReport(reportData);
    }

    // Generate PDF report
    const pdfBlob = await createPDFReport(reportData);
    
    // Check storage quota before upload
    const canUpload = await checkStorageQuota(pdfBlob.size);
    if (!canUpload) {
      throw new Error('Storage quota exceeded. Please upgrade your plan or free up space.');
    }

    // Create File object from blob
    const reportFileName = `inspection_report_${reportData.inspection.id}_${Date.now()}.pdf`;
    const reportFile = new File([pdfBlob], reportFileName, { type: 'application/pdf' });
    
    // Upload using new storage system
    const reportUrl = await uploadFile(
      reportFile,
      'report',
      reportData.inspection.id
    );

    if (!reportUrl) {
      throw new Error('Failed to upload report to storage');
    }

    // Save report record to database
    await saveReportRecord(reportData, reportUrl);

    return reportUrl;
  } catch (error: any) {
    console.error('Error generating inspection report:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

async function createPDFReport(reportData: {
  inspection: any;
  rooms: any[];
  primaryContactName: string;
  inspectorName: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  primaryContactSignature?: string;
  inspectorSignature?: string;
}): Promise<Blob> {
  const pdf = new jsPDF();
  let yPosition = 20;
  
  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Property Inspection Report', 20, yPosition);
  yPosition += 15;
  
  // Property and inspection details
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  const details = [
    `Property: ${reportData.inspection.propertyName || 'Property Name'}`,
    `Inspection Type: ${reportData.inspection.inspectionType}`,
    `Inspector: ${reportData.inspectorName}`,
    ...(reportData.primaryContactName ? [`Contact: ${reportData.primaryContactName}`] : []),
    `Date: ${new Date().toLocaleDateString()}`,
    `Start Time: ${reportData.startTime ? new Date(reportData.startTime).toLocaleTimeString() : 'N/A'}`,
    `End Time: ${reportData.endTime ? new Date(reportData.endTime).toLocaleTimeString() : 'N/A'}`,
    `Duration: ${reportData.duration ? formatDuration(reportData.duration) : 'N/A'}`,
  ];
  
  details.forEach(detail => {
    pdf.text(detail, 20, yPosition);
    yPosition += 7;
  });
  
  yPosition += 10;
  
  // Room sections
  reportData.rooms.forEach(room => {
    // Check if we need a new page
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }
    
    // Room header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(room.name, 20, yPosition);
    yPosition += 10;
    
    // Room items
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    room.items.forEach((item: any) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(`• ${item.label}:`, 25, yPosition);
      yPosition += 5;
      
      let valueText = 'Not completed';
      if (item.value !== null && item.value !== undefined) {
        if (Array.isArray(item.value)) {
          valueText = item.value.join(', ') || 'None selected';
        } else {
          valueText = String(item.value);
        }
      }
      
      pdf.text(`  Value: ${valueText}`, 30, yPosition);
      yPosition += 5;
      
      if (item.notes) {
        pdf.text(`  Notes: ${item.notes}`, 30, yPosition);
        yPosition += 5;
      }
      
      if (item.photos && item.photos.length > 0) {
        pdf.text(`  Photos: ${item.photos.length} attached`, 30, yPosition);
        yPosition += 5;
      }
      
      yPosition += 3;
    });
    
    yPosition += 5;
  });
  
  // Signature section
  if (reportData.inspectorSignature || reportData.primaryContactSignature) {
    if (yPosition > 150) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Signatures', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Inspector signature
    if (reportData.inspectorSignature) {
      pdf.text('Inspector signature:', 20, yPosition);
      yPosition += 10;
      pdf.text('[Inspector signature captured digitally]', 20, yPosition);
      yPosition += 7;
      pdf.text(`Signed by: ${reportData.inspectorName}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
      yPosition += 15;
    }
    
    // Primary contact signature (if applicable)
    if (reportData.primaryContactSignature && reportData.primaryContactName) {
      const contactLabel = reportData.inspection.inspectionType?.includes('check') ? 'Guest' : 'Client';
      pdf.text(`${contactLabel} signature:`, 20, yPosition);
      yPosition += 10;
      pdf.text(`[${contactLabel} signature captured digitally]`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Signed by: ${reportData.primaryContactName}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
    }
  }
  
  return pdf.output('blob');
}

function generateMockPDFReport(reportData: any): string {
  // Return a mock URL for dev mode
  return `https://example.com/reports/mock-report-${Date.now()}.pdf`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function saveReportRecord(reportData: any, reportUrl: string) {
  try {
    // In dev mode, just log the save operation
    if (devModeEnabled()) {
      console.log('Dev mode: Would save report record:', {
        inspectionId: reportData.inspection.id,
        reportUrl,
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    // Save to reports table (this would be implemented when the reports table exists)
    const { error } = await supabase
      .from('reports')
      .insert([{
        inspection_id: reportData.inspection.id,
        report_url: reportUrl,
        report_type: 'inspection',
        generated_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('Error saving report record:', error);
      // Don't throw here as the PDF was generated successfully
    }
  } catch (error) {
    console.error('Error saving report record:', error);
    // Don't throw here as the PDF was generated successfully
  }
}

export async function getReports(filters?: {
  propertyId?: string;
  inspectionType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Returning mock reports');
      return [
        {
          id: 'mock-report-1',
          inspectionId: 'mock-inspection-1',
          propertyName: 'Oceanview Apartment 2B',
          inspectionType: 'check_in',
          primaryContactName: 'John Smith',
          inspectorName: 'Jane Inspector',
          reportUrl: 'https://example.com/reports/mock-report-1.pdf',
          generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'mock-report-2',
          inspectionId: 'mock-inspection-2',
          propertyName: 'Downtown Loft 5A',
          inspectionType: 'check_out',
          primaryContactName: null,
          inspectorName: 'Mike Inspector',
          reportUrl: 'https://example.com/reports/mock-report-2.pdf',
          generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }

    let query = supabase
      .from('reports')
      .select(`
        *,
        inspections (
          property_id,
          inspection_type,
          primary_contact_name,
          inspector_name,
          properties (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.propertyId) {
      query = query.eq('inspections.property_id', filters.propertyId);
    }
    
    if (filters?.inspectionType) {
      query = query.eq('inspections.inspection_type', filters.inspectionType);
    }
    
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
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
    console.error('Error fetching reports:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}