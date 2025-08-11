import { createClient } from "npm:@supabase/supabase-js@2.39.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper function to extract file key from URL
function extractFileKeyFromUrl(url: string, minioBucketName: string): string | null {
  try {
    console.log('Email: Extracting file key from URL:', url);
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    console.log('Email: URL path parts:', pathParts);
    
    let fileKey = '';
    const bucketIndex = pathParts.findIndex(part => part.includes('storage-files') || part === minioBucketName);
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      fileKey = pathParts.slice(bucketIndex + 1).join('/');
    } else if (pathParts.length > 2) {
      // Fallback: skip first two parts (empty and bucket)
      fileKey = pathParts.slice(2).join('/');
    }
    
    console.log('Email: Extracted file key:', fileKey);
    return fileKey;
  } catch (error) {
    console.error('Email: Error extracting file key from URL:', error);
    return null;
  }
}

// Helper function to get signed URL for photos in emails
async function getSignedUrlForEmail(fileKey: string, supabaseUrl: string, supabaseServiceKey: string): Promise<string | null> {
  try {
    console.log('Email: Getting signed URL for file key:', fileKey);
    
    // Call storage API with service role key
    const response = await fetch(
      `${supabaseUrl}/functions/v1/storage-api/download/${fileKey}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Email: Storage API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Email: Storage API error:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('Email: Signed URL generated successfully');
    return data.fileUrl;
  } catch (error) {
    console.error('Email: Error getting signed URL:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("=== INSPECTION REPORT EMAIL FUNCTION START ===");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const minioBucketName = Deno.env.get("MINIO_BUCKET_NAME") || "storage-files";
    const fromEmail = "inspection-alerts@scopostay.com";

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error("Missing environment variables:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseServiceKey,
        hasResendApiKey: !!resendApiKey
      });
      throw new Error("Missing required environment variables");
    }

    console.log("Environment variables validated successfully");

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Supabase client initialized");

    // Parse request body
    const { inspectionId } = await req.json();

    if (!inspectionId) {
      throw new Error("Missing inspectionId parameter");
    }

    console.log("Processing inspection report emails for inspection:", inspectionId);

    // Get inspection details with property information
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select(`
        id,
        inspection_type,
        primary_contact_name,
        inspector_name,
        start_time,
        properties (
          name,
          address
        )
      `)
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspection) {
      console.error("Error fetching inspection:", inspectionError);
      throw new Error("Inspection not found");
    }

    console.log("Inspection details fetched:", {
      inspectionId: inspection.id,
      propertyName: inspection.properties?.name,
      inspectionType: inspection.inspection_type
    });

    // Get all inspection items marked for reporting
    const { data: markedItems, error: itemsError } = await supabase
      .from('inspection_items')
      .select(`
        id,
        value,
        notes,
        photo_urls,
        report_recipient_id,
        template_items (
          id,
          label
        ),
        report_service_teams (
          designation,
          email
        )
      `)
      .eq('inspection_id', inspectionId)
      .eq('marked_for_report', true);

    if (itemsError) {
      console.error("Error fetching marked items:", itemsError);
      throw new Error("Failed to fetch marked items");
    }

    console.log(`Found ${markedItems?.length || 0} items marked for reporting`);

    if (!markedItems || markedItems.length === 0) {
      console.log("No items marked for reporting, skipping email sending");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No items marked for reporting",
          emailsSent: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let emailsSent = 0;
    let emailErrors: string[] = [];

    // Process each marked item
    for (const item of markedItems) {
      try {
        const templateItem = item.template_items;
        const reportTeam = item.report_service_teams;

        if (!reportTeam?.email) {
          console.warn(`No report recipient email found for item ${item.id}`);
          emailErrors.push(`No report recipient email found for item: ${templateItem?.label || 'Unknown'}`);
          continue;
        }

        console.log(`Sending report email for item:`, {
          itemId: item.id,
          label: templateItem.label,
          recipientEmail: reportTeam.email,
          designation: reportTeam.designation
        });

        // Format the inspection date
        const inspectionDate = new Date(inspection.start_time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Construct email subject
        const emailSubject = `scopoStay Inspection Item (${inspection.properties?.name}, ${inspectionDate}, ${templateItem.label})`;

        // Format item value for display
        let valueDisplay = 'Not completed';
        if (item.value !== null && item.value !== undefined) {
          if (Array.isArray(item.value)) {
            valueDisplay = item.value.join(', ') || 'None selected';
          } else {
            valueDisplay = String(item.value);
          }
        }

        // Process photos for email embedding
        let photosHtml = '';
        let photosText = '';
        
        if (item.photo_urls && item.photo_urls.length > 0) {
          console.log(`Email: Processing ${item.photo_urls.length} photos for item ${item.id}`);
          
          const photoPromises = item.photo_urls.map(async (photoUrl: string, index: number) => {
            try {
              const fileKey = extractFileKeyFromUrl(photoUrl, minioBucketName);
              if (!fileKey) {
                console.warn(`Email: Could not extract file key from URL: ${photoUrl}`);
                return null;
              }
              
              const signedUrl = await getSignedUrlForEmail(fileKey, supabaseUrl, supabaseServiceKey);
              if (!signedUrl) {
                console.warn(`Email: Could not get signed URL for file key: ${fileKey}`);
                return null;
              }
              
              return {
                url: signedUrl,
                index: index + 1,
                label: `${templateItem.label} - Photo ${index + 1}`
              };
            } catch (error) {
              console.error(`Email: Error processing photo ${index + 1}:`, error);
              return null;
            }
          });
          
          const photoResults = await Promise.all(photoPromises);
          const validPhotos = photoResults.filter(photo => photo !== null);
          
          console.log(`Email: Successfully processed ${validPhotos.length}/${item.photo_urls.length} photos`);
          
          if (validPhotos.length > 0) {
            // Create HTML for photos
            photosHtml = `
              <div style="margin: 20px 0;">
                <h4 style="color: #374151; margin-bottom: 10px;">Attached Photos:</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                  ${validPhotos.map(photo => `
                    <div style="text-align: center;">
                      <img src="${photo.url}" alt="${photo.label}" style="max-width: 100%; height: auto; border: 1px solid #E5E7EB; border-radius: 8px; display: block; margin: 0 auto;">
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6B7280;">${photo.label}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
            
            // Create text version for photos
            photosText = `\nAttached Photos:\n${validPhotos.map(photo => `- ${photo.label}: ${photo.url}`).join('\n')}`;
          } else {
            photosHtml = '<p style="color: #6B7280; font-style: italic;">Photos were attached but could not be loaded for display.</p>';
            photosText = '\nPhotos: Attached but could not be loaded for display.';
          }
        }

        // Construct email content
        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inspection Item Report</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background-color: #2563EB;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 1px;
        }
        .email-body {
            padding: 40px 30px;
        }
        h1 {
            color: #2563EB;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        .alert-box {
            background-color: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .item-details {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #E5E7EB;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            color: #6B7280;
        }
        .email-footer {
            padding: 20px 30px;
            text-align: center;
            color: #666666;
            font-size: 12px;
            border-top: 1px solid #eeeeee;
        }
        @media only screen and (max-width: 480px) {
            .email-body {
                padding: 30px 20px;
            }
            h1 {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo">scopoStay</div>
        </div>
        <div class="email-body">
            <h1>🚨 Inspection Item Requires Attention</h1>
            
            <div class="alert-box">
                <h3 style="margin-top: 0; color: #DC2626;">Item Flagged for Review</h3>
                <p style="margin: 10px 0; color: #DC2626;">
                    An inspection item has been marked for your attention by the inspector.
                </p>
            </div>

            <div class="item-details">
                <h3 style="margin-top: 0; color: #374151;">Inspection Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Property:</span>
                    <span class="detail-value">${inspection.properties?.name || 'Unknown Property'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">${inspection.properties?.address || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Inspection Type:</span>
                    <span class="detail-value">${inspection.inspection_type?.replace('_', '-') || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Inspector:</span>
                    <span class="detail-value">${inspection.inspector_name || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${inspectionDate}</span>
                </div>
            </div>

            <div class="item-details">
                <h3 style="margin-top: 0; color: #374151;">Item Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Item:</span>
                    <span class="detail-value">${templateItem.label}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Value:</span>
                    <span class="detail-value">${valueDisplay}</span>
                </div>
                ${item.notes ? `
                <div class="detail-row">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${item.notes}</span>
                </div>
                ` : ''}
                ${item.photo_urls && item.photo_urls.length > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">Photos:</span>
                    <span class="detail-value">${item.photo_urls.length} photo(s) attached</span>
                </div>
                ` : ''}
            </div>

            ${photosHtml}

            <p>This item was flagged by the inspector during the inspection and requires your attention. Please review the details above and take appropriate action.</p>

            <p style="margin-top: 30px;">
                <strong>Next Steps:</strong><br>
                • Review the item details and photos<br>
                • Contact the inspector if clarification is needed<br>
                • Take appropriate corrective action<br>
                • Follow up with the property owner if necessary
            </p>

            <p style="margin-top: 30px;">
                Best regards,<br>
                The scopoStay Team
            </p>
        </div>
        <div class="email-footer">
            <p>&copy; ${new Date().getFullYear()} scopoStay. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `;

        const emailText = `scopoStay Inspection Item Report

🚨 ITEM FLAGGED FOR REVIEW

An inspection item has been marked for your attention by the inspector.

INSPECTION DETAILS:
Property: ${inspection.properties?.name || 'Unknown Property'}
Address: ${inspection.properties?.address || 'N/A'}
Inspection Type: ${inspection.inspection_type?.replace('_', '-') || 'N/A'}
Inspector: ${inspection.inspector_name || 'Unknown'}
Date: ${inspectionDate}

ITEM DETAILS:
Item: ${templateItem.label}
Value: ${valueDisplay}
${item.notes ? `Notes: ${item.notes}` : ''}
${photosText}

This item was flagged by the inspector during the inspection and requires your attention. Please review the details above and take appropriate action.

NEXT STEPS:
• Review the item details and photos
• Contact the inspector if clarification is needed
• Take appropriate corrective action
• Follow up with the property owner if necessary

Best regards,
The scopoStay Team

© ${new Date().getFullYear()} scopoStay. All rights reserved.
This is an automated message. Please do not reply to this email.`;

        // Send email using Resend API
        console.log(`Sending inspection item report email to: ${reportTeam.email}`);
        
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [reportTeam.email],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
            reply_to: "no-reply@scopostay.com",
            tags: [
              {
                name: 'category',
                value: 'inspection-item-report'
              },
              {
                name: 'inspection_id',
                value: inspectionId
              },
              {
                name: 'item_id',
                value: item.id
              }
            ]
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error(`Resend API error for ${reportTeam.email}:`, {
            status: resendResponse.status,
            statusText: resendResponse.statusText,
            error: errorData
          });
          emailErrors.push(`Failed to send email to ${reportTeam.email}: ${resendResponse.status} - ${errorData}`);
          continue;
        }

        const result = await resendResponse.json();
        
        console.log(`Inspection item report email sent successfully to ${reportTeam.email}:`, {
          emailId: result.id,
          itemLabel: templateItem.label
        });

        emailsSent++;
        
        // Add a small delay to avoid overwhelming Resend API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing inspection item report for item ${item.id}:`, error);
        emailErrors.push(`Failed to send email for item ${templateItem?.label || 'Unknown'}: ${error.message}`);
      }
    }

    console.log("Inspection item report processing completed:", {
      totalMarkedItems: markedItems.length,
      emailsSent,
      emailErrors: emailErrors.length,
      errors: emailErrors.length > 0 ? emailErrors : undefined
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Inspection item report processing completed`,
        stats: {
          totalMarkedItems: markedItems.length,
          emailsSent,
          emailErrors: emailErrors.length,
          errors: emailErrors.length > 0 ? emailErrors : undefined
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in inspection item report function:", {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});