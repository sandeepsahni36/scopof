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

export { addWatermarkToPage, addPageNumbers, loadImageAsDataUrl };