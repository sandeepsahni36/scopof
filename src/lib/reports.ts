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
    const fileName = generateReportFileName(reportData);
    const pdfFile = new File([pdfBlob], fileName, {
      type: 'application/pdf',
    });
    
    // Upload PDF via custom storage API with property name
    const uploadResult = await uploadFileWithPropertyName(
      pdfFile, 
      'report', 
      reportData.inspection.id,
      reportData.inspection.propertyName || 'Unknown_Property',
      reportData
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
        pdf.text(`  Notes: ${String(item.notes)}`, 30, yPosition);
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
              pdf.text(`    Photo ${i + 1}: [Invalid URL]`, 30, yPosition);
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
      
      try {
        // Check if signature data is valid before embedding
        if (reportData.inspectorSignature && 
            typeof reportData.inspectorSignature === 'string' && 
            reportData.inspectorSignature.startsWith('data:image/')) {
          pdf.addImage(
            reportData.inspectorSignature,
            'PNG',
            20,
            yPosition,
            60, // width in mm
            30  // height in mm
          );
          yPosition += 35; // Add spacing after signature
        } else {
          pdf.text('[Inspector signature could not be embedded]', 20, yPosition);
          yPosition += 7;
        }
      } catch (error) {
        console.error('Error embedding inspector signature:', error);
        pdf.text('[Inspector signature could not be embedded]', 20, yPosition);
        yPosition += 7;
      }
      
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
      
      try {
        // Check if signature data is valid before embedding
        if (reportData.primaryContactSignature && 
            typeof reportData.primaryContactSignature === 'string' && 
            reportData.primaryContactSignature.startsWith('data:image/')) {
          pdf.addImage(
            reportData.primaryContactSignature,
            'PNG',
            20,
            yPosition,
            60, // width in mm
            30  // height in mm
          );
          yPosition += 35; // Add spacing after signature
        } else {
          pdf.text(`[${contactLabel} signature could not be embedded]`, 20, yPosition);
          yPosition += 7;
        }
      } catch (error) {
        console.error('Error embedding primary contact signature:', error);
        pdf.text(`[${contactLabel} signature could not be embedded]`, 20, yPosition);
        yPosition += 7;
      }
      
      pdf.text(`Signed by: ${reportData.primaryContactName}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
    }
  }
  
  return pdf.output('blob');
}

function generateReportFileName(reportData: any): string {
  const propertyName = reportData.inspection.propertyName || reportData.propertyName || 'Unknown_Property';
  const inspectionType = reportData.inspection.inspectionType || reportData.inspection.inspection_type || 'inspection';
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  // Clean property name for filename
  const cleanPropertyName = propertyName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanInspectionType = inspectionType.replace('_', '-');
  
  return `${cleanPropertyName}_${cleanInspectionType}_${date}_${time}.pdf`;
}

// Enhanced upload function that includes property name
async function uploadFileWithPropertyName(
  file: File,
  fileType: 'photo' | 'report',
  inspectionId: string,
  propertyName: string,
  reportData?: any
): Promise<any> {
  try {
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    // Handle dev mode
    if (devModeEnabled()) {
      console.log('Dev mode: Mock file upload with property name');
      return {
        fileUrl: `https://example.com/mock-${fileType}-${Date.now()}.${file.type.split('/')[1]}`,
        fileKey: `mock-${fileType}-${Date.now()}`,
        metadataId: `mock-metadata-${Date.now()}`,
      };
    }

    // Get user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session token found');
    }

    // Prepare form data with property name
    const formData = new FormData();
    formData.append('file', file);
    formData.append('inspectionId', inspectionId);
    formData.append('propertyName', propertyName);
    
    // Add inspection type for better file naming
    if (reportData?.inspection?.inspectionType) {
      formData.append('inspectionType', reportData.inspection.inspectionType);
    }

    console.log('Uploading file via storage-api with property name:', {
      fileName: file.name,
      fileSize: file.size,
      fileType,
      inspectionId,
      propertyName,
      inspectionType: reportData?.inspection?.inspectionType
    });

    // Call the custom storage API Edge Function using fetch for proper FormData handling
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-api/upload/${fileType}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Storage API error:', errorData);
      
      // Check if it's an authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError(new Error(errorData.error || 'Authentication failed'));
        return null;
      }
      
      throw new Error(errorData.error || 'Failed to upload file');
    }

    const data = await response.json();

    if (!data || !data.fileUrl) {
      throw new Error('No file URL returned from storage API');
    }

    console.log('File uploaded successfully with property name:', {
      fileUrl: data.fileUrl,
      fileKey: data.fileKey,
      metadataId: data.metadataId
    });

    return {
      fileUrl: data.fileUrl,
      fileKey: data.fileKey,
      metadataId: data.metadataId,
    };
  } catch (error: any) {
    console.error('Error uploading file with property name:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

// Helper function to extract file key from MinIO URL
function extractFileKeyFromUrl(url: string): string | null {
  try {
    console.log('=== EXTRACT FILE KEY FROM URL ===');
    console.log('Input URL:', url);
    
    // Expected URL format: https://storage.scopostay.com:9000/storage-files/{admin_id}/photo/{uuid}.webp
    const urlObj = new URL(url);
    console.log('Parsed URL object:', {
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      protocol: urlObj.protocol
    });
    
    const pathParts = urlObj.pathname.split('/');
    console.log('Path parts:', pathParts);
    
    // Find the bucket name and extract everything after it
    const bucketIndex = pathParts.findIndex(part => part === 'storage-files');
    console.log('Bucket index found:', bucketIndex);
    
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      // Join all parts after the bucket name
      const fileKey = pathParts.slice(bucketIndex + 1).join('/');
      console.log('Extracted file key:', fileKey);
      console.log('=== END EXTRACT FILE KEY SUCCESS ===');
      return fileKey;
    }
    
    console.log('=== EXTRACT FILE KEY FAILED ===');
    console.log('Bucket index not found or invalid path structure');
    console.log('=== END EXTRACT FILE KEY FAILED ===');
    return null;
  } catch (error) {
    console.error('=== EXTRACT FILE KEY ERROR ===');
    console.error('Error extracting file key from URL:', error);
    console.error('URL that caused error:', url);
    console.error('=== END EXTRACT FILE KEY ERROR ===');
    return null;
  }
}

// Helper function to fetch and process image for PDF embedding
async function fetchAndProcessImage(imageUrl: string): Promise<{
  dataUrl: string;
  format: string;
} | null> {
  try {
    console.log('=== PDF IMAGE FETCH START ===');
    console.log('Fetching image for PDF embedding:', imageUrl);
    console.log('Image URL analysis:', {
      isValidUrl: imageUrl.startsWith('http'),
      urlLength: imageUrl.length,
      hostname: new URL(imageUrl).hostname,
      pathname: new URL(imageUrl).pathname
    });
    
    // Fetch the image
    const response = await fetch(imageUrl);
    
    console.log('=== PDF IMAGE FETCH RESPONSE ===');
    console.log('Fetch response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      console.error('=== PDF IMAGE FETCH FAILED ===');
      console.error('Failed to fetch image for PDF:', {
        url: imageUrl,
        status: response.status,
        statusText: response.statusText
      });
      console.error('=== END PDF IMAGE FETCH FAILED ===');
      return null;
    }
    
    const blob = await response.blob();
    
    console.log('=== PDF IMAGE BLOB PROCESSING ===');
    console.log('Blob details:', {
      type: blob.type,
      size: blob.size
    });
    
    const objectUrl = URL.createObjectURL(blob);
    console.log('Object URL created:', objectUrl);
    
    // Create an image element to load the blob
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS if needed
      
      img.onload = () => {
        console.log('=== PDF IMAGE LOAD SUCCESS ===');
        console.log('Image loaded for PDF processing:', {
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        
        try {
          // Create canvas to process the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('PDF image processing failed: could not get canvas context');
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Calculate dimensions to fit within PDF constraints
          const maxWidth = 300; // pixels
          const maxHeight = 225; // pixels
          
          let { width, height } = img;
          
          console.log('=== PDF IMAGE SCALING ===');
          console.log('Original dimensions:', { width, height });
          
          // Scale down if necessary
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
            console.log('Scaled dimensions:', { width, height, ratio });
          } else {
            console.log('No scaling needed');
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw the image onto the canvas
          ctx.drawImage(img, 0, 0, width, height);
          console.log('Image drawn to canvas successfully');
          
          // Convert to data URL (JPEG for smaller file size)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          console.log('=== PDF IMAGE CONVERSION SUCCESS ===');
          console.log('Data URL generated:', {
            length: dataUrl.length,
            startsWithData: dataUrl.startsWith('data:image/jpeg'),
            preview: dataUrl.substring(0, 50) + '...'
          });
          console.log('=== END PDF IMAGE CONVERSION SUCCESS ===');
          
          // Clean up object URL
          URL.revokeObjectURL(objectUrl);
          
          resolve({
            dataUrl,
            format: 'JPEG'
          });
        } catch (error) {
          console.error('=== PDF IMAGE PROCESSING ERROR ===');
          console.error('Error during canvas processing:', {
            message: error.message,
            stack: error.stack
          });
          console.error('=== END PDF IMAGE PROCESSING ERROR ===');
          // Clean up object URL on error
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('=== PDF IMAGE LOAD ERROR ===');
        console.error('Failed to load image for PDF processing:', {
          url: imageUrl,
          objectUrl: objectUrl,
          error: error
        });
        console.error('=== END PDF IMAGE LOAD ERROR ===');
        // Clean up object URL on error
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = objectUrl;
      console.log('Image src set to object URL, waiting for load...');
    });
  } catch (error) {
    console.error('=== PDF IMAGE PROCESSING OUTER ERROR ===');
    console.error('Outer error in fetchAndProcessImage:', {
      message: error.message,
      stack: error.stack,
      imageUrl: imageUrl
    });
    console.error('=== END PDF IMAGE PROCESSING OUTER ERROR ===');
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