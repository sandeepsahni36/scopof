import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.6";
import { Client as MinioClient } from "npm:minio@8.0.0";
import { Readable } from "node:stream";
import { parse } from "https://deno.land/std@0.168.0/path/mod.ts";
import { v4 as uuidv4 } from "npm:uuid@9.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS"
};

// Helper function to get environment variables safely
function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    console.log("=== STORAGE API EDGE FUNCTION START ===");
    console.log(`Request URL: ${req.url}`);
    console.log(`Request Method: ${req.method}`);

    // 1. Get Environment Variables
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const minioEndpoint = getEnv("MINIO_ENDPOINT");
    const minioAccessKey = getEnv("MINIO_ACCESS_KEY");
    const minioSecretKey = getEnv("MINIO_SECRET_KEY");
    const minioBucketName = getEnv("MINIO_BUCKET_NAME");

    console.log("Environment variables loaded:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey,
      minioEndpoint: minioEndpoint,
      hasMinioAccessKey: !!minioAccessKey,
      hasMinioSecretKey: !!minioSecretKey,
      minioBucketName: minioBucketName
    });

    // 2. Initialize Supabase Client (Service Role)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    // 3. Initialize MinIO Client with proper URL parsing
    const minioUrl = new URL(minioEndpoint);
    const minioClient = new MinioClient({
      endPoint: minioUrl.hostname,
      port: parseInt(minioUrl.port) || (minioUrl.protocol === 'https:' ? 443 : 80),
      useSSL: minioUrl.protocol === 'https:',
      accessKey: minioAccessKey,
      secretKey: minioSecretKey
    });

    console.log("MinIO client initialized:", {
      endPoint: minioUrl.hostname,
      port: parseInt(minioUrl.port) || (minioUrl.protocol === 'https:' ? 443 : 80),
      useSSL: minioUrl.protocol === 'https:',
      bucketName: minioBucketName
    });

    // 4. Authenticate User and Fetch Context (admin_id, tier, usage, quota)
    const authHeader = req.headers.get("Authorization");
    console.log("Auth: Received Authorization header:", authHeader ? "Present" : "Missing");
    
    if (authHeader) {
      console.log("Auth: Header starts with:", authHeader.substring(0, 20) + "...");
    }
    
    if (!authHeader) {
      console.warn("Auth: No authorization header provided");
      return new Response(JSON.stringify({
        error: "Unauthorized: No token provided"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Auth: Extracted token length:", token.length);
    console.log("Auth: Token starts with:", token.substring(0, 20) + "...");
    
    // Additional token validation
    if (!token || token.length < 10) {
      console.error("Auth: Token appears to be invalid or too short");
      return new Response(JSON.stringify({
        error: "Unauthorized: Invalid token format"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Try to decode the JWT to see what claims are present (for debugging)
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log("Auth: JWT payload claims:", Object.keys(payload));
        console.log("Auth: Has 'sub' claim:", !!payload.sub);
        console.log("Auth: Has 'aud' claim:", !!payload.aud);
        console.log("Auth: Has 'exp' claim:", !!payload.exp);
        console.log("Auth: Token type/aud:", payload.aud);
      }
    } catch (decodeError) {
      console.error("Auth: Failed to decode JWT for debugging:", decodeError.message);
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth: Invalid user token:", {
        error: userError?.message,
        code: userError?.code,
        status: userError?.status
      });
      return new Response(JSON.stringify({
        error: `Unauthorized: ${userError?.message || 'Invalid token'}`
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("User authenticated:", { id: user.id, email: user.email });

    // Fetch admin_id and tier for the authenticated user
    const { data: adminData, error: adminDbError } = await supabase
      .from('admin')
      .select('id, subscription_tier')
      .eq('owner_id', user.id)
      .single();

    if (adminDbError || !adminData) {
      console.error("Auth: Admin data not found for user:", user.id, adminDbError?.message);
      return new Response(JSON.stringify({
        error: "Forbidden: Admin data not found"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("Admin data found:", { adminId: adminData.id, tier: adminData.subscription_tier });

    // Fetch current storage usage for the admin
    const { data: usageData, error: usageDbError } = await supabase
      .from('storage_usage')
      .select('total_bytes, photos_bytes, reports_bytes, file_count')
      .eq('admin_id', adminData.id)
      .maybeSingle(); // Use maybeSingle if a record might not exist yet

    if (usageDbError && usageDbError.code !== 'PGRST116') {
      console.error("Auth: Error fetching storage usage from DB:", usageDbError?.message);
      return new Response(JSON.stringify({
        error: "Internal Server Error: Could not fetch usage"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const currentUsageBytes = usageData?.total_bytes || 0;

    // Fetch storage quota for the admin's tier
    const { data: quotaData, error: quotaDbError } = await supabase
      .from('storage_quotas')
      .select('quota_bytes')
      .eq('tier', adminData.subscription_tier)
      .single();

    if (quotaDbError || !quotaData) {
      console.error("Auth: Error fetching quota from DB:", quotaDbError?.message);
      return new Response(JSON.stringify({
        error: "Internal Server Error: Could not fetch quota"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const quotaBytes = quotaData.quota_bytes;

    // User context for easy access in handlers
    const userContext = {
      userId: user.id,
      adminId: adminData.id,
      tier: adminData.subscription_tier,
      currentUsage: currentUsageBytes,
      quota: quotaBytes,
      photosUsage: usageData?.photos_bytes || 0,
      reportsUsage: usageData?.reports_bytes || 0,
      fileCount: usageData?.file_count || 0
    };

    console.log("User context:", userContext);

    // 5. Route Handling
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean); // e.g., ["storage-api", "upload", "photo"]
    
    // Remove 'functions', 'v1' from path if present (Supabase function URL structure)
    const cleanedSegments = pathSegments.filter(segment => 
      segment !== 'functions' && segment !== 'v1' && segment !== 'storage-api'
    );
    
    const endpoint = cleanedSegments[0]; // e.g., "upload"
    const subEndpoint = cleanedSegments[1]; // e.g., "photo" or fileKey part

    console.log("Route handling:", { endpoint, subEndpoint, pathSegments });

    switch (endpoint) {
      case "upload": {
        if (req.method !== "POST") {
          return new Response(JSON.stringify({
            error: "Method Not Allowed"
          }), {
            status: 405,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        const fileType = subEndpoint; // 'photo' or 'report'
        if (!['photo', 'report'].includes(fileType)) {
          return new Response(JSON.stringify({
            error: "Invalid file type specified"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        console.log("Processing upload for file type:", fileType);

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const inspectionId = formData.get("inspectionId") as string;
        const inspectionItemId = formData.get("inspectionItemId") as string;

        console.log('=== STORAGE API UPLOAD DEBUG ===');
        console.log('Received inspectionId:', inspectionId);
        console.log('Received inspectionItemId:', inspectionItemId);
        console.log('File name:', file?.name);
        console.log('File type:', fileType);
        console.log('=== END STORAGE API DEBUG ===');

        if (!file) {
          return new Response(JSON.stringify({
            error: "No file uploaded"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        console.log("File details:", {
          name: file.name,
          size: file.size,
          type: file.type,
          inspectionId,
          inspectionItemId
        });

        // File type validation
        const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const allowedReportMimes = ['application/pdf'];

        if (fileType === 'photo' && !allowedImageMimes.includes(file.type)) {
          return new Response(JSON.stringify({
            error: "Invalid image file format"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        if (fileType === 'report' && !allowedReportMimes.includes(file.type)) {
          return new Response(JSON.stringify({
            error: "Invalid PDF file format"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        // Quota Enforcement
        const newFileSize = file.size;
        if (userContext.currentUsage + newFileSize > userContext.quota) {
          console.warn(`Quota exceeded for admin ${userContext.adminId}. Current: ${userContext.currentUsage}, New file: ${newFileSize}, Quota: ${userContext.quota}`);
          return new Response(JSON.stringify({
            error: "Storage quota exceeded"
          }), {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        // Generate unique object name for MinIO
        const fileExtension = parse(file.name).ext;
        
        // Get company name for folder structure
        const { data: adminData, error: adminError } = await supabase
          .from('admin')
          .select('company_name')
          .eq('id', userContext.adminId)
          .single();
        
        if (adminError) {
          console.error("Error fetching company name:", adminError);
          throw new Error("Failed to fetch company information");
        }
        
        // Clean company name for folder structure
        const cleanCompanyName = adminData.company_name
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toLowerCase();
        
        // Create hierarchical structure: company/inspections/inspection_id/photos or reports
        let objectName;
        if (fileType === 'photo' && inspectionId) {
          objectName = `${cleanCompanyName}/inspections/${inspectionId}/photos/${inspectionItemId || 'general'}/${uuidv4()}${fileExtension}`;
        } else if (fileType === 'report' && inspectionId) {
          objectName = `${cleanCompanyName}/inspections/${inspectionId}/reports/${uuidv4()}${fileExtension}`;
        } else {
          // Fallback to old structure
          objectName = `${cleanCompanyName}/${fileType}/${uuidv4()}${fileExtension}`;
        }

        console.log("Generated object name:", objectName);

        try {
          // Convert Web ReadableStream to Node.js Readable stream
          const webStream = file.stream();
          const nodeStream = Readable.fromWeb(webStream);

          // Upload file to MinIO
          await minioClient.putObject(
            minioBucketName, 
            objectName, 
            nodeStream, 
            file.size, 
            {
              'Content-Type': file.type,
              'X-Amz-Meta-Inspection-Id': inspectionId || '',
              'X-Amz-Meta-Inspection-Item-Id': inspectionItemId || '',
              'X-Amz-Meta-Admin-Id': userContext.adminId,
              'X-Amz-Meta-File-Type': fileType
            }
          );

          console.log(`File uploaded to MinIO: ${objectName}`);

          // Save file metadata to Supabase
          const { data: metadata, error: metadataError } = await supabase
            .from('file_metadata')
            .insert({
              admin_id: userContext.adminId,
              file_key: objectName,
              file_name: file.name,
              file_type: fileType,
              file_size: newFileSize,
              mime_type: file.type,
              inspection_id: inspectionId || null,
              inspection_item_id: inspectionItemId || null,
              s3_bucket: minioBucketName,
              s3_region: 'us-east-1', // Default region for MinIO
              upload_status: 'completed'
            })
            .select()
            .single();

          if (metadataError) {
            console.error("DB: Error saving file metadata:", metadataError?.message);
            console.log('=== FILE METADATA ERROR DEBUG ===');
            console.log('Full metadata error object:', JSON.stringify(metadataError, null, 2));
            console.log('Attempted inspection_item_id:', inspectionItemId);
            console.log('Attempted inspection_id:', inspectionId);
            console.log('Admin ID:', userContext.adminId);
            console.log('=== END METADATA ERROR DEBUG ===');
            // Consider deleting the file from MinIO if DB insert fails for consistency
            try {
              await minioClient.removeObject(minioBucketName, objectName);
              console.log("MinIO: Cleaned up object after DB error");
            } catch (cleanupError) {
              console.error("MinIO: Failed to clean up object after DB error:", cleanupError);
            }
            return new Response(JSON.stringify({
              error: "Failed to record file metadata"
            }), {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          console.log("File metadata saved:", metadata);

          // Construct public URL for the file
          const fileUrl = `${minioEndpoint}/${minioBucketName}/${objectName}`;

          return new Response(JSON.stringify({
            message: "File uploaded successfully",
            fileUrl: fileUrl,
            fileKey: objectName,
            metadataId: metadata.id
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });

        } catch (minioError) {
          console.error("MinIO: File upload failed:", minioError?.message);
          return new Response(JSON.stringify({
            error: "File upload failed to storage"
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }

      case "download": {
        if (req.method !== "GET") {
          return new Response(JSON.stringify({
            error: "Method Not Allowed"
          }), {
            status: 405,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        const fileKey = pathSegments.slice(2).join('/'); // Reconstruct fileKey from remaining path segments
        if (!fileKey) {
          return new Response(JSON.stringify({
            error: "File key not provided"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        console.log("Processing download for file key:", fileKey);

        try {
          // Verify user authorization to access this file
          const { data: fileMetadata, error: metaError } = await supabase
            .from('file_metadata')
            .select('admin_id')
            .eq('file_key', fileKey)
            .single();

          if (metaError || !fileMetadata) {
            console.warn(`DB: File metadata not found for ${fileKey}:`, metaError?.message);
            return new Response(JSON.stringify({
              error: "File not found or unauthorized"
            }), {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          if (fileMetadata.admin_id !== userContext.adminId) {
            console.warn(`Auth: Unauthorized access attempt for file ${fileKey} by admin ${userContext.adminId}`);
            return new Response(JSON.stringify({
              error: "Forbidden: You do not have access to this file"
            }), {
              status: 403,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          // Generate a pre-signed URL for secure, temporary access
          // The URL will allow direct download from MinIO without proxying through the Edge Function
          const presignedUrl = await minioClient.presignedGetObject(
            minioBucketName, 
            fileKey, 
            60 * 5 // 5 minutes expiry
          );

          console.log(`MinIO: Generated presigned URL for ${fileKey}`);

          return new Response(JSON.stringify({
            message: "File URL generated successfully",
            fileUrl: presignedUrl
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });

        } catch (error) {
          console.error("MinIO: File download failed:", error?.message);
          return new Response(JSON.stringify({
            error: "Failed to generate file URL"
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }

      case "delete": {
        if (req.method !== "DELETE") {
          return new Response(JSON.stringify({
            error: "Method Not Allowed"
          }), {
            status: 405,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        const fileKey = pathSegments.slice(2).join('/'); // Reconstruct fileKey
        if (!fileKey) {
          return new Response(JSON.stringify({
            error: "File key not provided"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        console.log("Processing delete for file key:", fileKey);

        try {
          // Verify user authorization and get file details for DB update
          const { data: fileMetadata, error: metaError } = await supabase
            .from('file_metadata')
            .select('id, admin_id')
            .eq('file_key', fileKey)
            .single();

          if (metaError || !fileMetadata) {
            console.warn(`DB: File metadata not found for ${fileKey}:`, metaError?.message);
            return new Response(JSON.stringify({
              error: "File not found or unauthorized"
            }), {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          if (fileMetadata.admin_id !== userContext.adminId) {
            console.warn(`Auth: Unauthorized deletion attempt for file ${fileKey} by admin ${userContext.adminId}`);
            return new Response(JSON.stringify({
              error: "Forbidden: You do not have permission to delete this file"
            }), {
              status: 403,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          // Delete from MinIO
          await minioClient.removeObject(minioBucketName, fileKey);
          console.log(`MinIO: File deleted: ${fileKey}`);

          // Delete metadata from Supabase (trigger will handle storage_usage update)
          const { error: dbDeleteError } = await supabase
            .from('file_metadata')
            .delete()
            .eq('id', fileMetadata.id);

          if (dbDeleteError) {
            console.error("DB: Error deleting file metadata:", dbDeleteError?.message);
            return new Response(JSON.stringify({
              error: "Failed to delete file metadata"
            }), {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
              }
            });
          }

          console.log("File metadata deleted from database");

          return new Response(JSON.stringify({
            message: "File deleted successfully"
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });

        } catch (error) {
          console.error("MinIO: File deletion failed:", error?.message);
          return new Response(JSON.stringify({
            error: "File deletion failed"
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }

      case "usage": {
        if (req.method !== "GET") {
          return new Response(JSON.stringify({
            error: "Method Not Allowed"
          }), {
            status: 405,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        console.log("Returning usage data for admin:", userContext.adminId);

        // userContext already contains the necessary usage and quota data
        return new Response(JSON.stringify({
          currentUsage: userContext.currentUsage,
          photosUsage: userContext.photosUsage,
          reportsUsage: userContext.reportsUsage,
          fileCount: userContext.fileCount,
          quota: userContext.quota,
          tier: userContext.tier
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      default:
        console.warn("Unknown endpoint:", endpoint);
        return new Response(JSON.stringify({
          error: "Not Found"
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
    }

  } catch (error) {
    console.error("Unhandled error in Edge Function:", error?.message);
    console.error("Error stack:", error?.stack);
    return new Response(JSON.stringify({
      error: "Internal Server Error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});