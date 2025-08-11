import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import { uploadFile } from './storage';
import jsPDF from 'jspdf';

// Mock data for dev mode
const MOCK_REPORTS = [
  {
    id: 'mock-report-1',
    inspectionId: 'mock-inspection-1',
    propertyName: 'Oceanview Apartment 2B',
    inspectionType: 'check_in',
    primaryContactName: 'John Smith',
    inspectorName: 'Jane Inspector',
    reportUrl: 'https://example.com/mock-report-1.pdf',
    fileKey: 'mock-report-1.pdf',
    generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

let mockReportsState = [...MOCK_REPORTS];

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
      return mockReportsState;
    }

    let query = supabase
      .from('reports')
      .select(`
        id,
        inspection_id,
        report_url,
        file_key,
        generated_at,
        created_at,
        inspections (
          inspection_type,
          primary_contact_name,
          inspector_name,
          properties (
            name
          )
        )
      `)
      .order('generated_at', { ascending: false });

    // Apply filters
    if (filters?.propertyId) {
      query = query.eq('inspections.property_id', filters.propertyId);
    }

    if (filters?.inspectionType) {
      query = query.eq('inspections.inspection_type', filters.inspectionType);
    }

    if (filters?.dateFrom) {
      query = query.gte('generated_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('generated_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    // Transform data to match expected format
    return data?.map(report => ({
      id: report.id,
      inspectionId: report.inspection_id,
      propertyName: report.inspections?.properties?.name || 'Unknown Property',
      inspectionType: report.inspections?.inspection_type || 'unknown',
      primaryContactName: report.inspections?.primary_contact_name || '',
      inspectorName: report.inspections?.inspector_name || '',
      reportUrl: report.report_url,
      fileKey: report.file_key,
      generatedAt: report.generated_at,
      createdAt: report.created_at,
    })) || [];
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function generateInspectionReport(reportData: any): Promise<string | null> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock PDF generation');
      return 'https://example.com/mock-report.pdf';
    }

    // Fetch admin branding data
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('logo_url, brand_color, report_background, subscription_tier, company_name')
      .eq('owner_id', user.id)
      .single();

    if (adminError) {
      console.error('Error fetching admin branding data:', adminError);
      // Continue with defaults
    }

    // Prepare branding data for PDF generation
    const brandingData = {
      logoUrl: adminData?.subscription_tier === 'starter' ? '/Scopostay long full logo blue.png' : (adminData?.logo_url || '/Scopostay long full logo blue.png'),
      brandColor: adminData?.subscription_tier === 'starter' ? '#2563EB' : (adminData?.brand_color || '#2563EB'),
      reportBackground: adminData?.subscription_tier === 'starter' ? '#FFFFFF' : (adminData?.report_background || '#FFFFFF'),
      subscriptionTier: adminData?.subscription_tier || 'starter',
      companyName: adminData?.company_name || 'Company',
    };

    console.log('Generating PDF with branding data:', brandingData);

    // Generate PDF with branding
    const pdfBlob = await createPDFReport({
      ...reportData,
      ...brandingData,
    });

    // Convert blob to file for upload
    const pdfFile = new File([pdfBlob], `inspection-report-${Date.now()}.pdf`, {
      type: 'application/pdf',
    });

    // Upload PDF to storage
    const uploadResult = await uploadFile(
      pdfFile,
      'report',
      reportData.inspection.id,
      undefined
    );

    if (!uploadResult) {
      throw new Error('Failed to upload PDF report');
    }

    // Save report record to database
    await saveReportRecord(reportData, uploadResult.fileUrl, uploadResult.fileKey);

    return uploadResult.fileUrl;
  } catch (error: any) {
    console.error('Error generating inspection report:', error);
    
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

async function createPDFReport(reportData: any): Promise<Blob> {
  const pdf = new jsPDF();
  
  // Load company logo
  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadImageAsDataUrl(reportData.logoUrl);
    console.log('Logo loaded successfully for PDF');
  } catch (error) {
    console.error('Error loading logo for PDF:', error);
    // Continue without logo
  }

  // Set document properties
  pdf.setProperties({
    title: `Inspection Report - ${reportData.inspection.propertyName}`,
    subject: 'Property Inspection Report',
    author: 'scopoStay',
    creator: 'scopoStay Property Inspection Platform',
  });

  let yPosition = 20;

  // Add header with logo and branding
  function addHeader() {
    // Header background with brand color
    pdf.setFillColor(reportData.brandColor || '#2563EB');
    pdf.rect(0, 0, pdf.internal.pageSize.width, 40, 'F');

    // Add logo if available
    if (logoDataUrl) {
      try {
        pdf.addImage(logoDataUrl, 'PNG', 15, 8, 60, 24);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
        // Add text fallback
        pdf.setTextColor('#FFFFFF');
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('scopoStay', 15, 25);
      }
    } else {
      // Fallback to text logo
      pdf.setTextColor('#FFFFFF');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('scopoStay', 15, 25);
    }

    // Report title
    pdf.setTextColor('#FFFFFF');
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INSPECTION REPORT', pdf.internal.pageSize.width - 15, 25, { align: 'right' });

    // Add watermark for starter tier
    if (reportData.subscriptionTier === 'starter') {
      addWatermarkToPage(pdf);
    }

    // Reset text color for content
    pdf.setTextColor('#000000');
  }

  // Add first page header
  addHeader();
  yPosition = 60;

  // Property Information Section
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Property Information', 20, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  const propertyInfo = [
    ['Property Name:', reportData.inspection.propertyName || 'N/A'],
    ['Inspection Type:', reportData.inspection.inspection_type?.replace('_', ' ').toUpperCase() || 'N/A'],
    ['Inspector:', reportData.inspectorName || 'N/A'],
    ['Primary Contact:', reportData.primaryContactName || 'N/A'],
    ['Date:', new Date(reportData.startTime).toLocaleDateString()],
    ['Duration:', reportData.duration ? `${Math.floor(reportData.duration / 60)} minutes` : 'N/A'],
  ];

  propertyInfo.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 20, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 80, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Inspection Items Section
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Inspection Details', 20, yPosition);
  yPosition += 15;

  // Process each room/step
  for (const step of reportData.rooms || []) {
    // Check if we need a new page
    if (yPosition > 250) {
      pdf.addPage();
      addHeader();
      yPosition = 60;
    }

    // Section header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(step.name, 20, yPosition);
    yPosition += 12;

    // Process items in this section
    for (const item of step.items || []) {
      const templateItem = item.template_items || item.templateItem;
      
      if (!templateItem || templateItem.type === 'divider') {
        continue;
      }

      // Check if we need a new page
      if (yPosition > 260) {
        pdf.addPage();
        addHeader();
        yPosition = 60;
      }

      // Item label
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(templateItem.label, 25, yPosition);
      yPosition += 8;

      // Item value
      if (item.value !== null && item.value !== undefined) {
        pdf.setFont('helvetica', 'normal');
        let valueText = '';
        
        if (Array.isArray(item.value)) {
          valueText = item.value.join(', ');
        } else {
          valueText = String(item.value);
        }
        
        pdf.text(`Response: ${valueText}`, 30, yPosition);
        yPosition += 6;
      }

      // Item notes
      if (item.notes) {
        pdf.setFont('helvetica', 'italic');
        const noteLines = pdf.splitTextToSize(`Notes: ${item.notes}`, 150);
        pdf.text(noteLines, 30, yPosition);
        yPosition += noteLines.length * 5;
      }

      // Photos
      if (item.photo_urls && item.photo_urls.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Photos: ${item.photo_urls.length} attached`, 30, yPosition);
        yPosition += 6;
      }

      yPosition += 5; // Space between items
    }

    yPosition += 10; // Space between sections
  }

  // Signatures Section
  if (yPosition > 200) {
    pdf.addPage();
    addHeader();
    yPosition = 60;
  }

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signatures', 20, yPosition);
  yPosition += 20;

  // Inspector signature
  if (reportData.inspectorSignature) {
    try {
      pdf.addImage(reportData.inspectorSignature, 'PNG', 20, yPosition, 80, 40);
    } catch (error) {
      console.error('Error adding inspector signature to PDF:', error);
    }
  }
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Inspector: ${reportData.inspectorName || 'N/A'}`, 20, yPosition + 45);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition + 52);

  // Primary contact signature (if present)
  if (reportData.primaryContactSignature) {
    try {
      pdf.addImage(reportData.primaryContactSignature, 'PNG', 110, yPosition, 80, 40);
    } catch (error) {
      console.error('Error adding primary contact signature to PDF:', error);
    }
    
    pdf.text(`Primary Contact: ${reportData.primaryContactName || 'N/A'}`, 110, yPosition + 45);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 110, yPosition + 52);
  }

  // Add page numbers to all pages
  addPageNumbers(pdf);

  return pdf.output('blob');
}

async function saveReportRecord(reportData: any, reportUrl: string, fileKey: string) {
  try {
    const { error } = await supabase
      .from('reports')
      .insert([{
        inspection_id: reportData.inspection.id,
        report_url: reportUrl,
        file_key: fileKey,
        report_type: 'inspection',
        generated_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('Error saving report record:', error);
      throw error;
    }

    console.log('Report record saved successfully');
  } catch (error) {
    console.error('Error in saveReportRecord:', error);
    throw error;
  }
}

// Helper function to add watermark to PDF page
function addWatermarkToPage(pdf: any) {
  try {
    // Save current state
    const currentFontSize = pdf.internal.getFontSize();
    const currentTextColor = pdf.getTextColor();
    
    // Set watermark properties
    pdf.setFontSize(50);
    pdf.setTextColor(200, 200, 200); // Light gray
    pdf.setFont('helvetica', 'bold');
    
    // Calculate center position
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    
    // Add rotated watermark text
    pdf.text('STARTER PLAN', centerX, centerY, {
      angle: 45,
      align: 'center'
    });
    
    // Restore previous state
    pdf.setFontSize(currentFontSize);
    pdf.setTextColor(currentTextColor);
  } catch (error) {
    console.error('Error adding watermark to PDF page:', error);
    // Continue without watermark if there's an error
  }
}

// Helper function to add page numbers to all pages
function addPageNumbers(pdf: any) {
  try {
    const totalPages = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Save current state
      const currentFontSize = pdf.internal.getFontSize();
      
      // Set page number properties
      pdf.setFontSize(10);
      pdf.setTextColor('#666666');
      
      // Add page number at bottom left
      pdf.text(
        `Page ${i} of ${totalPages}`,
        20, // 20mm from left edge
        pdf.internal.pageSize.height - 10 // 10mm from bottom
      );
      
      // Restore font size
      pdf.setFontSize(currentFontSize);
      pdf.setTextColor('#000000');
    }
  } catch (error) {
    console.error('Error adding page numbers to PDF:', error);
    // Continue without page numbers if there's an error
  }
}

// Helper function to load image as data URL
async function loadImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    // Handle relative URLs by converting to absolute
    const absoluteUrl = imageUrl.startsWith('/') 
      ? `${window.location.origin}${imageUrl}`
      : imageUrl;
    
    const response = await fetch(absoluteUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image as data URL:', error);
    return null;
  }
}