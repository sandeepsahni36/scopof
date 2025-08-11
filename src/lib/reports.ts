import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import jsPDF from 'jspdf';
import { uploadFile } from './storage';
import { getSignedUrlForFile } from './storage';

export async function getReports(inspectionId?: string) {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    let query = supabase
      .from('reports')
      .select(`
        *,
        inspections (
          id,
          property_id,
          inspection_type,
          start_time,
          properties (
            name,
            address
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (inspectionId) {
      query = query.eq('inspection_id', inspectionId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
    }
    throw error;
  }
}

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

    if (devModeEnabled()) {
      console.log('Dev mode: Generating mock PDF report');
      return generateMockPDFReport(reportData);
    }

    // Add loading state for PDF generation
    console.log('Starting PDF generation...');
    const pdfBlob = await createPDFReport(reportData);
    const fileName = generateReportFileName(reportData);
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    const uploadResult = await uploadFileWithPropertyName(
      pdfFile, 
      'report', 
      reportData.inspection.id,
      reportData.inspection.propertyName || 'Unknown_Property',
      reportData
    );
    
    if (!uploadResult) throw new Error('Failed to upload PDF report');
    
    await saveReportRecord(reportData, uploadResult.fileUrl, uploadResult.fileKey);
    console.log('PDF report generated and uploaded successfully');
    return uploadResult.fileUrl;
  } catch (error: any) {
    console.error('Error generating inspection report:', error);
    
    // Enhanced error handling
    let errorMessage = 'Failed to generate report';
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      errorMessage = 'Authentication error. Please sign in again.';
    } else if (error.message?.includes('storage')) {
      errorMessage = 'Failed to save report to storage.';
    } else if (error.message?.includes('PDF')) {
      errorMessage = 'Failed to create PDF document.';
    }
    
    throw new Error(errorMessage);
  }
}

async function createPDFReport(reportData: any): Promise<Blob> {
  const companySettings = await getCompanySettings(reportData.inspection.property_id);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  
  let yPosition = 20;
  let pageNumber = 1;
  const totalPages = await calculateTotalPages(reportData, companySettings);
  
  // First page setup
  await addPageHeader(pdf, yPosition, companySettings, pageNumber, totalPages);
  if (companySettings.subscription_tier === 'starter' || companySettings.subscription_status === 'trialing') {
    addWatermark(pdf, companySettings);
  }
  
  yPosition = await addInspectionDetails(pdf, reportData, yPosition, companySettings);
  
  // Process each room/section
  for (const room of reportData.rooms) {
    if (yPosition > 220) {
      pdf.addPage();
      pageNumber++;
      await addPageHeader(pdf, 20, companySettings, pageNumber, totalPages);
      yPosition = 50;
      if (companySettings.subscription_tier === 'starter') {
        addWatermark(pdf, companySettings);
      }
    }
    
    yPosition = await addSectionHeader(pdf, room, yPosition, companySettings);
    
    // Filter out items disabled for reports and apply recipient filtering if needed
    const reportItems = room.items?.filter((item: any) => {
      const templateItem = item.template_items || item.templateItem;
      if (templateItem?.report_enabled === false) return false;
      
      // If report recipient is specified, only include items for that recipient
      if (reportData.reportRecipientId && templateItem?.report_recipient_id) {
        return templateItem.report_recipient_id === reportData.reportRecipientId;
      }
      
      return true;
    }) || [];
    
    if (reportItems.length > 0) {
      yPosition = await addChecklistTable(pdf, reportItems, yPosition, companySettings);
    }
    
    const sectionPhotos = await collectSectionPhotos(room);
    if (sectionPhotos.length > 0) {
      if (yPosition > 180) {
        pdf.addPage();
        pageNumber++;
        await addPageHeader(pdf, 20, companySettings, pageNumber, totalPages);
        yPosition = 50;
      }
      
      yPosition = addPhotosSubheader(pdf, yPosition, companySettings);
      yPosition = await addPhotoGrid(pdf, sectionPhotos, yPosition, companySettings);
    }
    
    yPosition += 15;
  }

  // Signature section
  if (reportData.inspectorSignature || reportData.inspection.inspector_signature_image_url) {
    if (yPosition > 150) {
      pdf.addPage();
      pageNumber++;
      await addPageHeader(pdf, 20, companySettings, pageNumber, totalPages);
      yPosition = 50;
    }
    yPosition = await addSignatureSection(pdf, reportData, yPosition, companySettings);
  }

  // Set document metadata
  pdf.setProperties({
    title: `Inspection Report - ${reportData.inspection.propertyName} - ${new Date().toLocaleDateString()}`,
    creator: companySettings.company_name || 'scopoStay',
    subject: `${reportData.inspection.inspection_type} Inspection Report`,
    keywords: `inspection, property, ${reportData.inspection.propertyName}`
  });

  return pdf.output('blob');
}

// Enhanced company settings fetch with error resilience
async function getCompanySettings(propertyId: string) {
  try {
    if (devModeEnabled()) {
      return {
        company_name: 'ScopoStay Demo',
        logo_url: null,
        brand_color: '#2563EB',
        report_background: '#FFFFFF',
        subscription_tier: 'starter',
        subscription_status: 'active',
        trial_ends_at: null,
        property_metadata: {
          address: '101 Example Street',
          type: 'Apartment',
          bedrooms: '2',
          bathrooms: '1'
        }
      };
    }

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('admin_id, address, type, bedrooms, bathrooms')
      .eq('id', propertyId)
      .single();

    if (propertyError) throw propertyError;

    const { data: admin, error: adminError } = await supabase
      .from('admin')
      .select(`
        company_name, 
        logo_url, 
        brand_color,
        report_background,
        subscription_tier,
        subscription_status,
        trial_ends_at
      `)
      .eq('id', property.admin_id)
      .single();

    if (adminError) throw adminError;

    return {
      ...admin,
      property_metadata: {
        address: property.address,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms
      }
    };
  } catch (error) {
    console.error('Error getting company settings:', error);
    return {
      company_name: 'Property Management',
      logo_url: null,
      brand_color: '#2563EB',
      report_background: '#FFFFFF',
      subscription_tier: 'starter',
      subscription_status: 'active',
      property_metadata: {
        address: '',
        type: 'Property',
        bedrooms: '',
        bathrooms: ''
      }
    };
  }
}

// Enhanced page header with better logo handling
async function addPageHeader(pdf: any, yPos: number, companySettings: any, pageNum: number, totalPages: number) {
  const headerColor = hex2rgb(companySettings.brand_color);
  pdf.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  pdf.rect(0, 0, 210, 35, 'F');

  // Company logo/name
  if (companySettings.subscription_tier === 'starter') {
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('scopoStay', 20, 22);
  } else if (companySettings.logo_url) {
    try {
      const logoData = await fetchAndProcessImage(companySettings.logo_url);
      if (logoData) {
        // Calculate aspect ratio and scale logo appropriately
        const logoWidth = 40;
        const logoHeight = Math.min(15, (logoData.height * logoWidth) / logoData.width);
        pdf.addImage(logoData.dataUrl, logoData.format, 20, 10 + (15 - logoHeight)/2, logoWidth, logoHeight);
      }
    } catch (error) {
      console.warn('Failed to load company logo, falling back to text', error);
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companySettings.company_name, 20, 22);
    }
  }

  // Page number
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Page ${pageNum} of ${totalPages}`, 190, 22, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
}

// Enhanced watermark with trial support
function addWatermark(pdf: any, companySettings: any) {
  pdf.saveGraphicsState();
  pdf.setGState(new pdf.GState({ opacity: 0.1 }));
  
  const centerX = pdf.internal.pageSize.getWidth() / 2;
  const centerY = pdf.internal.pageSize.getHeight() / 2;

  pdf.setFontSize(50);
  pdf.setFont('helvetica', 'bold');
  
  if (companySettings.subscription_status === 'trialing') {
    pdf.setTextColor(255, 0, 0);
    const trialEndDate = companySettings.trial_ends_at 
      ? new Date(companySettings.trial_ends_at).toLocaleDateString()
      : 'soon';
    pdf.text(`TRIAL ENDS ${trialEndDate}`, centerX, centerY - 30, { angle: 45, align: 'center' });
  }
  
  if (companySettings.subscription_tier === 'starter') {
    pdf.setTextColor(128, 128, 128);
    pdf.text('Created with scopoStay', centerX, centerY, { angle: 45, align: 'center' });
  }

  pdf.restoreGraphicsState();
}

// Enhanced inspection details with property metadata
async function addInspectionDetails(pdf: any, reportData: any, yPos: number, companySettings: any): Promise<number> {
  let yPosition = yPos + 10;

  // Property type badge
  pdf.setFillColor(230, 230, 230);
  pdf.roundedRect(20, yPosition, 30, 10, 3, 3, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(companySettings.property_metadata.type?.toUpperCase() || 'PROPERTY', 35, yPosition + 7, { align: 'center' });

  // Bed/bath info
  pdf.setFontSize(9);
  const bedBathText = [
    companySettings.property_metadata.bedrooms && `Bed: ${companySettings.property_metadata.bedrooms}`,
    companySettings.property_metadata.bathrooms && `Bath: ${companySettings.property_metadata.bathrooms}`
  ].filter(Boolean).join(' | ');
  
  if (bedBathText) {
    pdf.text(bedBathText, 160, yPosition + 7);
  }

  yPosition += 15;

  // Main title
  const typeColor = {
    'check_in': '#4CAF50',
    'check_out': '#F44336',
    'move_in': '#2196F3',
    'move_out': '#FF9800'
  }[reportData.inspection.inspection_type] || companySettings.brand_color;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hex2rgb(typeColor));
  pdf.text('Property Inspection Report', 20, yPosition);
  yPosition += 20;

  // Details box
  pdf.setFillColor(hex2rgb(companySettings.report_background));
  pdf.rect(20, yPosition, 170, 50, 'F');
  pdf.setDrawColor(220, 220, 220);
  pdf.rect(20, yPosition, 170, 50);

  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);

  const details = [
    ['Property:', reportData.inspection.propertyName || 'Property Name'],
    ['Address:', companySettings.property_metadata.address || ''],
    ['Inspection Type:', formatInspectionType(reportData.inspection.inspection_type)],
    ['Inspector:', reportData.inspectorName],
    ['Date:', new Date().toLocaleDateString()],
    ['Start Time:', reportData.startTime ? new Date(reportData.startTime).toLocaleTimeString() : 'N/A'],
    ['End Time:', reportData.endTime ? new Date(reportData.endTime).toLocaleTimeString() : 'N/A'],
    ['Duration:', reportData.duration ? formatDuration(reportData.duration) : 'N/A'],
  ];

  if (reportData.primaryContactName) {
    details.splice(3, 0, ['Contact:', reportData.primaryContactName]);
  }

  // Two-column layout
  let col1Y = yPosition;
  let col2Y = yPosition;
  
  details.forEach((detail, index) => {
    if (index < Math.ceil(details.length / 2)) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(detail[0], 25, col1Y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(detail[1], 25 + 50, col1Y);
      col1Y += 6;
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.text(detail[0], 120, col2Y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(detail[1], 120 + 40, col2Y);
      col2Y += 6;
    }
  });

  return yPosition + 60;
}

// Enhanced signature section with URL fallback
async function addSignatureSection(pdf: any, reportData: any, yPos: number, companySettings: any): Promise<number> {
  let yPosition = yPos + 10;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hex2rgb(companySettings.brand_color));
  pdf.text('Signatures', 20, yPosition);
  yPosition += 20;

  // Fetch signatures with fallback to URLs
  const [inspectorSig, clientSig] = await Promise.all([
    reportData.inspectorSignature || fetchSignature(reportData.inspection.inspector_signature_image_url),
    reportData.primaryContactSignature || fetchSignature(reportData.inspection.primary_contact_signature_url)
  ]);

  // Inspector signature
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Inspector Signature:', 20, yPosition);
  yPosition += 10;

  pdf.rect(20, yPosition, 80, 80);
  if (inspectorSig) {
    try {
      pdf.addImage(inspectorSig, 'PNG', 21, yPosition + 1, 78, 78);
    } catch (error) {
      pdf.setTextColor(150, 150, 150);
      pdf.text('Signature Image', 60, yPosition + 40, { align: 'center' });
    }
  } else {
    pdf.setTextColor(200, 200, 200);
    pdf.text('No signature provided', 60, yPosition + 40, { align: 'center' });
  }

  // Client signature if available
  if (clientSig && reportData.primaryContactName) {
    const contactLabel = reportData.inspection.inspection_type?.includes('check') ? 'Guest' : 'Client';
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${contactLabel} Signature:`, 120, yPosition - 10);
    
    pdf.rect(120, yPosition, 80, 80);
    try {
      pdf.addImage(clientSig, 'PNG', 121, yPosition + 1, 78, 78);
    } catch (error) {
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${contactLabel} Signature`, 160, yPosition + 40, { align: 'center' });
    }

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Signed by: ${reportData.primaryContactName}`, 120, yPosition + 90);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 120, yPosition + 97);
  }

  // Inspector details
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Signed by: ${reportData.inspectorName}`, 20, yPosition + 90);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition + 97);

  return yPosition + 110;
}

// Enhanced photo grid with template labels and timestamps
async function addPhotoGrid(pdf: any, photos: any[], yPos: number, companySettings: any): Promise<number> {
  const photoWidth = 50;
  const photoHeight = 40;
  const spacing = 10;
  let yPosition = yPos;

  for (let i = 0; i < photos.length; i += 3) {
    if (yPosition + photoHeight + 30 > 280) {
      pdf.addPage();
      await addPageHeader(pdf, 20, companySettings, 0, 0); // Page numbers will update
      yPosition = 50;
    }

    const rowPhotos = photos.slice(i, i + 3);
    for (let j = 0; j < rowPhotos.length; j++) {
      const photo = rowPhotos[j];
      const xPos = 20 + (j * (photoWidth + spacing));

      try {
        const signedUrl = await getSignedUrlForFile(photo.fileKey);
        const imageData = await fetchAndProcessImage(signedUrl);
        
        if (imageData) {
          pdf.addImage(imageData.dataUrl, imageData.format, xPos, yPosition, photoWidth, photoHeight);
          pdf.link(xPos, yPosition, photoWidth, photoHeight, { url: signedUrl });

          // Photo timestamp
          if (photo.created_at) {
            const photoTime = new Date(photo.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
            pdf.setFontSize(6);
            pdf.setTextColor(100, 100, 100);
            pdf.text(photoTime, xPos + photoWidth - 2, yPosition + 2, { align: 'right' });
          }

          // Enhanced photo label using template item label if available
          const itemLabel = photo.templateItem?.label || photo.label;
          const label = itemLabel?.length > 20 ? itemLabel.substring(0, 20) + '...' : itemLabel;
          
          pdf.setFontSize(8);
          pdf.setTextColor(64, 64, 64);
          pdf.text(label || `Photo ${i + j + 1}`, xPos + (photoWidth / 2), yPosition + photoHeight + 5, { align: 'center' });
        }
      } catch (error) {
        console.error('Error processing photo:', error);
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(xPos, yPosition, photoWidth, photoHeight);
        pdf.setFontSize(8);
        pdf.text('Photo unavailable', xPos + (photoWidth / 2), yPosition + (photoHeight / 2), { align: 'center' });
      }
    }
    yPosition += photoHeight + 15;
  }

  return yPosition + 10;
}

// Helper functions
function hex2rgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 37, g: 99, b: 235 }; // Default blue
}

function formatInspectionType(type: string): string {
  return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Inspection';
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

async function fetchAndProcessImage(url: string): Promise<{ dataUrl: string; format: string; width: number; height: number } | null> {
  if (!url) return null;
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: reader.result as string,
            format: blob.type.split('/')[1] || 'png',
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

async function fetchSignature(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const fileKey = extractFileKeyFromUrl(url);
    if (!fileKey) return null;
    
    const signedUrl = await getSignedUrlForFile(fileKey);
    const response = await fetch(signedUrl);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching signature:', error);
    return null;
  }
}

function extractFileKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1];
  } catch {
    return null;
  }
}

async function calculateTotalPages(reportData: any, companySettings: any): Promise<number> {
  // This is a simplified estimation - you may want to make it more accurate
  let pages = 1; // Cover page
  
  // Count pages for items
  let itemsHeight = 0;
  for (const room of reportData.rooms) {
    const reportItems = room.items?.filter((item: any) => {
      const templateItem = item.template_items || item.templateItem;
      return templateItem?.report_enabled !== false;
    }) || [];
    
    itemsHeight += 10 + (reportItems.length * 5);
  }
  pages += Math.ceil(itemsHeight / 250);
  
  // Count pages for photos
  let photosCount = 0;
  for (const room of reportData.rooms) {
    const sectionPhotos = await collectSectionPhotos(room);
    photosCount += sectionPhotos.length;
  }
  pages += Math.ceil(photosCount / 6);
  
  // Signature page
  if (reportData.inspectorSignature || reportData.inspection.inspector_signature_image_url) {
    pages += 1;
  }
  
  return pages;
}

async function collectSectionPhotos(room: any): Promise<any[]> {
  if (!room.items) return [];
  
  const photos = [];
  for (const item of room.items) {
    if (item.photos && item.photos.length > 0) {
      for (const photo of item.photos) {
        photos.push({
          ...photo,
          templateItem: item.template_items || item.templateItem,
          label: item.label || photo.label
        });
      }
    }
  }
  return photos;
}

function addPhotosSubheader(pdf: any, yPos: number, companySettings: any): number {
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hex2rgb(companySettings.brand_color));
  pdf.text('Photos', 20, yPos);
  return yPos + 10;
}

async function addSectionHeader(pdf: any, room: any, yPos: number, companySettings: any): Promise<number> {
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hex2rgb(companySettings.brand_color));
  
  const sectionName = room.name || 'Section';
  pdf.text(sectionName, 20, yPos);
  
  // Add small divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPos + 2, 50, yPos + 2);
  
  return yPos + 10;
}

async function addChecklistTable(pdf: any, items: any[], yPos: number, companySettings: any): Promise<number> {
  let yPosition = yPos;
  
  // Table header
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Item', 20, yPosition);
  pdf.text('Status', 160, yPosition, { align: 'right' });
  yPosition += 5;
  
  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  for (const item of items) {
    if (yPosition > 270) {
      pdf.addPage();
      await addPageHeader(pdf, 20, companySettings, 0, 0);
      yPosition = 50;
    }
    
    const templateItem = item.template_items || item.templateItem;
    const label = templateItem?.label || item.label || 'Item';
    
    // Truncate long labels
    const displayLabel = label.length > 60 ? label.substring(0, 57) + '...' : label;
    pdf.text(displayLabel, 25, yPosition);
    
    // Status indicator based on item type
    if (item.value || item.selected_options) {
      let statusText = '';
      let statusColor = '#4CAF50'; // Green by default
      
      if (item.type === 'single_choice' || item.type === 'multiple_choice') {
        const options = item.selected_options || [];
        if (options.length > 0) {
          statusText = options.map((opt: any) => opt.label).join(', ');
          // Use the color of the first selected option
          statusColor = options[0]?.color || statusColor;
        }
      } else if (item.type === 'photo' && item.photos?.length > 0) {
        statusText = `${item.photos.length} photo(s)`;
      } else if (item.value) {
        statusText = item.value.toString();
      }
      
      if (statusText) {
        const rgb = hex2rgb(statusColor);
        pdf.setTextColor(rgb.r, rgb.g, rgb.b);
        pdf.text(statusText, 160, yPosition, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
      }
    }
    
    yPosition += 5;
  }
  
  return yPosition + 10;
}

function generateReportFileName(reportData: any): string {
  const propertyName = reportData.inspection.propertyName || 'property';
  const inspectionType = reportData.inspection.inspection_type || 'inspection';
  const date = new Date().toISOString().split('T')[0];
  
  return `${propertyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${inspectionType}_report_${date}.pdf`;
}

async function uploadFileWithPropertyName(
  file: File,
  fileType: string,
  inspectionId: string,
  propertyName: string,
  reportData: any
): Promise<{ fileUrl: string; fileKey: string } | null> {
  try {
    const sanitizedPropertyName = propertyName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${fileType}/${sanitizedPropertyName}/${inspectionId}/${file.name}`;
    
    const uploadResult = await uploadFile(file, fileName);
    if (!uploadResult) throw new Error('Upload failed');
    
    return {
      fileUrl: uploadResult.publicUrl,
      fileKey: uploadResult.fileKey
    };
  } catch (error) {
    console.error('Error uploading report:', error);
    throw new Error('Failed to upload report file');
  }
}

async function saveReportRecord(reportData: any, fileUrl: string, fileKey: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reports')
      .upsert({
        inspection_id: reportData.inspection.id,
        report_url: fileUrl,
        file_key: fileKey,
        report_type: 'pdf',
        generated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving report record:', error);
    // Non-critical error - we can continue even if this fails
  }
}

function generateMockPDFReport(reportData: any): string {
  const mockTier = localStorage.getItem('devTier') || 'starter';
  const isTrial = Math.random() > 0.5;
  
  return `mock-report-${reportData.inspection.id}.pdf`;
}