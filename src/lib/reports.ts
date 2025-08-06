import { supabase, validateUserSession, handleAuthError, devModeEnabled } from './supabase';
import jsPDF from 'jspdf';
import { uploadFile } from './storage';
import { getSignedUrlForFile } from './storage';

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
    
    // Create a File object from the blob for upload
    const pdfFile = new File([pdfBlob], `inspection-report-${Date.now()}.pdf`, {
      type: 'application/pdf',
    });
    
    // Upload PDF via custom storage API
    const uploadResult = await uploadFile(pdfFile, 'report', reportData.inspection.id);
    
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
  for (const room of reportData.rooms) {
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
    
    for (const item of room.items) {
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
      
      // Handle photos - embed them in the PDF
      if (item.photos && item.photos.length > 0) {
        pdf.text(`  Photos (${item.photos.length}):`, 30, yPosition);
        yPosition += 5;
        
        for (let i = 0; i < item.photos.length; i++) {
          const photoUrl = item.photos[i];
          
          try {
            // Extract file key from URL for signed URL generation
            const fileKey = extractFileKeyFromUrl(photoUrl);
            
            if (fileKey) {
              // Get signed URL for secure access
              const signedUrl = await getSignedUrlForFile(fileKey);
              
              if (signedUrl) {
                // Fetch and embed the image
                const imageData = await fetchAndProcessImage(signedUrl);
                
                if (imageData) {
                  // Check if we need a new page for the image
                  if (yPosition > 200) {
                    pdf.addPage();
                    yPosition = 20;
                  }
                  
                  // Add image to PDF (scaled to fit)
                  const imageWidth = 80; // Max width in mm
                  const imageHeight = 60; // Max height in mm
                  
                  pdf.addImage(
                    imageData.dataUrl,
                    imageData.format,
                    30,
                    yPosition,
                    imageWidth,
                    imageHeight
                  );
                  
                  yPosition += imageHeight + 10; // Add spacing after image
                  
                  // Add photo caption
                  pdf.setFontSize(8);
                  pdf.text(`Photo ${i + 1} of ${item.photos.length}`, 30, yPosition);
                  pdf.setFontSize(10);
                  yPosition += 5;
                } else {
                  // Fallback if image couldn't be processed
                  pdf.text(`    Photo ${i + 1}: [Image could not be embedded]`, 30, yPosition);
                  yPosition += 5;
                }
              } else {
                // Fallback if signed URL couldn't be generated
                pdf.text(`    Photo ${i + 1}: [Access denied]`, 30, yPosition);
                yPosition += 5;
              }
            } else {
              // Fallback if file key couldn't be extracted
              pdf.text(`    Photo ${i + 1}: [Invalid file reference]`, 30, yPosition);
              yPosition += 5;
            }
          } catch (error) {
            console.error(`Error embedding photo ${i + 1} for item ${item.label}:`, error);
            // Add fallback text for failed photo
            pdf.text(`    Photo ${i + 1}: [Failed to load]`, 30, yPosition);
            yPosition += 5;
          }
        }
      }
      
      yPosition += 3;
    }
    
    yPosition += 5;
  }
  
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

// Helper function to extract file key from MinIO URL
function extractFileKeyFromUrl(url: string): string | null {
  try {
    // Expected URL format: https://storage.scopostay.com:9000/storage-files/{admin_id}/photo/{uuid}.webp
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the bucket name and extract everything after it
    const bucketIndex = pathParts.findIndex(part => part === 'storage-files');
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      // Join all parts after the bucket name
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file key from URL:', error);
    return null;
  }
}

// Helper function to fetch and process image for PDF embedding
async function fetchAndProcessImage(imageUrl: string): Promise<{
  dataUrl: string;
  format: string;
} | null> {
  try {
    console.log('Fetching image for PDF embedding:', imageUrl);
    
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    
    // Create an image element to load the blob
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS if needed
      
      img.onload = () => {
        try {
          // Create canvas to process the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Calculate dimensions to fit within PDF constraints
          const maxWidth = 300; // pixels
          const maxHeight = 225; // pixels
          
          let { width, height } = img;
          
          // Scale down if necessary
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw the image onto the canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to data URL (JPEG for smaller file size)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          resolve({
            dataUrl,
            format: 'JPEG'
          });
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Create object URL from blob and set as image source
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
      
      // Clean up object URL after image loads
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        img.onload(); // Call the original onload
      };
    });
  } catch (error) {
    console.error('Error processing image for PDF:', error);
    return null;
  }
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

async function saveReportRecord(reportData: any, reportUrl: string, fileKey: string) {
  try {
    // In dev mode, just log the save operation
    if (devModeEnabled()) {
      console.log('Dev mode: Would save report record:', {
        inspectionId: reportData.inspection.id,
        reportUrl,
        fileKey,
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
        file_key: fileKey,
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

    // Transform the data to match the Report interface expected by the frontend
    return data?.map(item => ({
      id: item.id,
      inspectionId: item.inspection_id,
      propertyName: item.inspections?.properties?.name || 'Unknown Property',
      inspectionType: item.inspections?.inspection_type || 'check_in',
      primaryContactName: item.inspections?.primary_contact_name || 'N/A',
      inspectorName: item.inspections?.inspector_name || 'Unknown Inspector',
      reportUrl: item.report_url || '',
      fileKey: item.file_key || '',
      generatedAt: item.generated_at || item.created_at,
      createdAt: item.created_at,
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