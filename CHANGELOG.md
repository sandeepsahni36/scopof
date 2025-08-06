## [2025-01-31] - Critical Photo Preview and Camera Access Fixes

### Fixed
- Fixed photo preview size by increasing from w-32 to w-40 h-40 (160px x 160px) for much better visibility
- Fixed "Inspection History" blank page by properly declaring `deletingInspections` state variable at component top level
- Fixed photo preview loading by adding comprehensive signed URL debugging and error logging
- Fixed PDF download "AccessDenied" errors by increasing presigned URL expiry from 30 to 60 minutes
- Fixed PDF filename to include inspection type: `Property_Name_check-in_YYYY-MM-DD_HH-MM-SS.pdf`

### Added
- Added camera access for photo uploads using `capture="environment"` attribute
- Added comprehensive logging for signed URL generation and photo loading debugging
- Added inspection type to PDF filenames for better organization
- Added enhanced error logging for photo preview failures
- Added proper state variable declaration for inspection deletion functionality

### Changed
- Photo upload now opens camera directly instead of file picker (on mobile devices)
- Photo preview boxes increased to w-40 h-40 for much better visibility
- Upload button text changed from "Add Photo" to "Take Photo" to reflect camera functionality
- PDF storage path now includes inspection type: `company/inspections/id/reports/Property_Name_check-in_YYYY-MM-DD_HH-MM-SS.pdf`
- Presigned URL expiry extended to 60 minutes to prevent access timeouts
- Enhanced debugging output for troubleshooting photo and signed URL issues

### Technical Details
- Camera access uses `capture="environment"` to prefer rear-facing camera on mobile devices
- Photo previews use signed URLs for secure access to private MinIO storage with 60-minute expiry
- Comprehensive logging added throughout photo loading pipeline for debugging
- PDF filenames now include inspection type for better file organization
- State variables properly scoped to prevent ReferenceError crashes
- Enhanced error handling and logging for photo preview failures

## [2025-01-31] - Critical Inspection and Report Fixes

### Fixed
- Fixed photo preview in live inspections by implementing proper signed URL loading with increased size (w-32 h-32)
- Fixed "Inspection History" blank page by adding missing `deletingInspections` state variable
- Fixed inspector and client names not displaying on signature page by correcting database field mapping
- Fixed signature boxes to be perfect squares (320x320px) with centered layout
- Fixed report download to save files to disk using blob-based download mechanism
- Fixed PDF filename to include property name and timestamp in MinIO storage path
- Fixed "AccessDenied" errors by increasing presigned URL expiry from 5 to 30 minutes

### Added
- Added interactive "Client is Present" checkbox on signature page for real estate inspections
- Added dynamic client signature box that appears when "Client is Present" is checked
- Added comprehensive logging for photo URL generation and signed URL creation
- Added blob-based download mechanism for reliable file saving
- Added property name and timestamp to PDF filenames in MinIO storage
- Added enhanced error handling for photo preview failures

### Changed
- Photo preview boxes increased from h-24 to w-32 h-32 for better visibility
- Signature canvas boxes are now perfect squares (320x320px) instead of full-width rectangles
- "Client is Present" checkbox moved from start page to signature page for better UX
- Client signature box now appears dynamically based on checkbox state
- Report download now uses blob fetching for reliable file saving to disk
- PDF storage path now includes property name: `company/inspections/id/reports/Property_Name_YYYY-MM-DD_HH-MM-SS.pdf`
- Presigned URL expiry increased to 30 minutes to prevent access errors

### Technical Details
- Photo previews use signed URLs for secure access to private MinIO storage
- Signature canvas uses explicit width/height (320x320) instead of CSS classes
- Report download fetches files as blobs and creates temporary object URLs
- PDF filenames include property name and timestamp for better organization
- MinIO storage structure: `{company_name}/inspections/{inspection_id}/reports/{property_name}_{date}_{time}.pdf`
- Enhanced logging throughout photo and signature workflows for debugging
- Client present status is stored in database and controls signature requirements

## [2025-01-31] - Comprehensive Inspection and Report Management Fixes

### Fixed
- Fixed photo preview in live inspections by implementing signed URLs for secure image access
- Fixed "Inspection History" blank page by adding missing `deletingInspections` state variable
- Fixed inspector and client names not displaying on signature page by correcting database field mapping
- Fixed "Client Present" checkbox visibility and functionality for real estate inspections
- Fixed signature boxes to be perfect squares (320x320px) instead of wide rectangles
- Fixed report download to save files to disk instead of opening in browser
- Fixed duplicate delete buttons on reports page
- Fixed PDF filename generation to include property name, inspection type, and timestamp

### Added
- Added signed URL generation for photo previews in live inspections
- Added delete functionality for inspections from property detail page
- Added cleanup utility for incomplete inspections in admin settings
- Added proper blob-based download mechanism for reports
- Added enhanced logging for debugging name field issues
- Added loading states for photo URL generation
- Added error handling for photo preview failures

### Changed
- Photo preview boxes increased from h-24 to h-32 for better visibility
- Signature canvas boxes are now perfect squares (320x320px) with centered layout
- Report download now uses blob fetching for reliable file saving
- PDF filenames now follow format: `Property_Name_inspection-type_YYYY-MM-DD_HH-MM-SS.pdf`
- MinIO storage structure uses company name: `company_name/inspections/inspection_id/photos/item_id/uuid.webp`
- Inspector and client names are properly mapped from database snake_case fields
- "Client Present" checkbox properly controls primary contact signature requirement

### Technical Details
- Photo previews use signed URLs for secure access to private MinIO storage
- Signature canvas uses explicit width/height (320x320) instead of CSS classes for perfect squares
- Report download fetches files as blobs and creates temporary object URLs for download
- Inspection deletion cascades to remove all associated photos, reports, and database records
- Company-based folder structure: `{company_name}/inspections/{inspection_id}/photos/{item_id}/{uuid}.webp`
- PDF reports include property name in metadata for better file organization
- Cleanup utility removes incomplete inspections and all associated MinIO files
- Enhanced error handling and loading states throughout the inspection workflow

## [2025-01-31] - Complete Inspection and Report Management Fixes

### Fixed
- Fixed signature embedding in PDF reports by properly implementing `pdf.addImage()` calls for both inspector and primary contact signatures
- Fixed infinite recursion bug in `fetchAndProcessImage` function that was causing "Complete Inspection" to hang
- Fixed duplicate name input fields - names are now only collected once at inspection start, not again at signature
- Fixed "Client is Present" checkbox to be interactive and properly control signature requirements
- Fixed inspection history display on property detail page - now shows actual completed inspections
- Fixed report download functionality to save files to local disk instead of opening in browser
- Fixed database field mapping for inspector and client names (snake_case vs camelCase)
- Fixed missing `deletingInspections` state variable that was causing inspection history page to crash
- Fixed duplicate delete buttons on reports page
- Fixed photo preview size in live inspections (increased from h-24 to h-32)
- Fixed signature boxes to be more square-shaped (w-80 h-64) and centered

### Added
- Added delete functionality for reports with confirmation dialog
- Added proper inspection history table with type, inspector, contact, date, status, and duration columns
- Added loading states for inspection history and report operations
- Added file deletion from MinIO storage when reports are deleted
- Added larger signature canvas boxes (h-64 instead of h-40) for better signature capture
- Added read-only display of inspection details (inspector name, contact name, client present status) on signature page
- Added delete functionality for inspections from property detail page
- Added company-based folder structure in MinIO storage for better organization
- Added cleanup functionality for incomplete inspections in admin settings
- Added blob-based download mechanism for more reliable file downloads

### Changed
- Signature canvas boxes are now larger and more square-shaped for better usability
- Inspector and contact names are displayed as read-only text on signature page instead of editable inputs
- Report download now triggers actual file download instead of opening in new window
- Inspection history shows real data from database instead of placeholder empty state
- Delete button for reports includes proper cleanup of both database records and MinIO files
- MinIO storage structure now uses company name: `company_name/inspections/inspection_id/photos/` and `company_name/inspections/inspection_id/reports/`
- PDF report filenames now include property name, inspection type, date, and time for better organization
- Photo preview includes error handling with fallback placeholder image
- Photo preview boxes increased in size for better visibility

### Technical Details
- Signatures are embedded as PNG images with 60mm x 30mm dimensions in PDF reports
- Object URL cleanup is properly handled to prevent memory leaks during image processing
- Report deletion removes both the database record and the actual file from MinIO storage
- Inspection history loads dynamically when the "Inspection History" tab is selected
- Inspection deletion cascades to remove all associated photos, reports, and database records
- MinIO folder structure: `{company_name}/inspections/{inspection_id}/photos/{item_id}/{uuid}.webp`
- Report files: `{company_name}/inspections/{inspection_id}/reports/{uuid}.pdf`
- Download mechanism uses blob fetching and URL.createObjectURL for reliable file saving
- Added cleanup utility for incomplete inspections accessible from admin settings

## [2025-01-31] - Complete Inspection and Report Management Fixes

### Fixed
- Fixed signature embedding in PDF reports by properly implementing `pdf.addImage()` calls for both inspector and primary contact signatures
- Fixed infinite recursion bug in `fetchAndProcessImage` function that was causing "Complete Inspection" to hang
- Fixed duplicate name input fields - names are now only collected once at inspection start, not again at signature
- Fixed "Client is Present" checkbox to be interactive and properly control signature requirements
- Fixed inspection history display on property detail page - now shows actual completed inspections
- Fixed report download functionality to save files to local disk instead of opening in browser

### Added
- Added delete functionality for reports with confirmation dialog
- Added proper inspection history table with type, inspector, contact, date, status, and duration columns
- Added loading states for inspection history and report operations
- Added file deletion from MinIO storage when reports are deleted
- Added larger signature canvas boxes (h-64 instead of h-40) for better signature capture
- Added read-only display of inspection details (inspector name, contact name, client present status) on signature page

### Changed
- Signature canvas boxes are now larger and more square-shaped for better usability
- Inspector and contact names are displayed as read-only text on signature page instead of editable inputs
- Report download now triggers actual file download instead of opening in new window
- Inspection history shows real data from database instead of placeholder empty state
- Delete button for reports includes proper cleanup of both database records and MinIO files

### Technical Details
- Signatures are embedded as PNG images with 60mm x 30mm dimensions in PDF reports
- Object URL cleanup is properly handled to prevent memory leaks during image processing
- Report deletion removes both the database record and the actual file from MinIO storage
- Inspection history loads dynamically when the "Inspection History" tab is selected

## [2025-01-31] - Fix Photo and Signature Embedding in PDF Reports

### Fixed
- Fixed `fetchAndProcessImage` function where `img.onload` handler was incorrectly overwriting itself
- Fixed signature embedding by replacing placeholder text with actual `pdf.addImage()` calls
- Resolved issue where photos were uploaded successfully but not appearing in PDF reports
- Fixed object URL cleanup to prevent memory leaks during image processing

### Changed
- Modified PDF generation to embed actual signature images instead of placeholder text
- Enhanced image processing to properly handle canvas drawing and data URL conversion
- Improved error handling for both photo and signature embedding failures
- Added proper cleanup of object URLs after image processing

### Technical Details
- Photos are now fetched using signed URLs and embedded as JPEG images in PDFs
- Signatures are embedded as PNG images with 60mm x 30mm dimensions
- Images are automatically scaled to fit within PDF layout constraints
- Fallback text is shown if image embedding fails

## [2025-01-31] - Fix Photo and Signature Embedding in PDF Reports

### Fixed
- Fixed `fetchAndProcessImage` function where `img.onload` handler was incorrectly overwriting itself
- Fixed signature embedding by replacing placeholder text with actual `pdf.addImage()` calls
- Resolved issue where photos were uploaded successfully but not appearing in PDF reports
- Fixed object URL cleanup to prevent memory leaks during image processing

### Changed
- Modified PDF generation to embed actual signature images instead of placeholder text
- Enhanced image processing to properly handle canvas drawing and data URL conversion
- Improved error handling for both photo and signature embedding failures
- Added proper cleanup of object URLs after image processing

### Technical Details
- Photos are now fetched using signed URLs and embedded as JPEG images in PDFs
- Signatures are embedded as PNG images with 60mm x 30mm dimensions
- Images are automatically scaled to fit within PDF layout constraints
- Fallback text is shown if image embedding fails

## [2025-08-05] - Implement Photo Embedding in PDF Reports

### Added
- Added photo embedding functionality to PDF reports
- Added `extractFileKeyFromUrl` helper function to extract MinIO file keys from URLs
- Added `fetchAndProcessImage` helper function to fetch, scale, and convert images for PDF embedding
- Added proper image scaling to fit within PDF layout constraints
- Added error handling for image fetching and processing failures
- Added fallback text when images cannot be embedded

### Fixed
- Fixed ReferenceError: createdInspectionItems is not defined in createInspection function
- Properly destructured the data property from Supabase insert response
- Resolved inspection creation failure that was preventing inspections from starting

### Changed
- Modified `createPDFReport` function to fetch and embed actual photos instead of just showing photo counts
- Enhanced PDF layout to accommodate embedded images with proper spacing
- Converted forEach loops to for...of loops to support async operations
- Images are now scaled and converted to JPEG format for optimal PDF file size

### Technical Details
- Photos are fetched using signed URLs for secure access
- Images are processed through HTML5 Canvas for scaling and format conversion
- PDF layout automatically handles page breaks when images don't fit
- Each embedded photo includes a caption showing its position in the sequence

## [2025-01-31] - Fix Inspection Creation ReferenceError

### Fixed
- Fixed ReferenceError: createdInspectionItems is not defined in createInspection function
- Properly destructured the data property from Supabase insert response
- Resolved inspection creation failure that was preventing inspections from starting

### Changed
- Modified createInspection function to correctly assign createdInspectionItems variable
- Enhanced error handling for inspection item creation process

## [2025-01-31] - Enhanced UUID Validation for Photo Uploads

### Added
- Enhanced logging in `buildRoomsFromInspectionData` to show all inspection item IDs received from database
- Added comprehensive validation logging to track which inspection items are being processed vs skipped
- Added detailed debug output to identify the source of invalid inspection item IDs
- Added UUID validation using `uuid.validate()` function to ensure inspection item IDs are valid
- Enhanced logging to show UUID validation results for inspection items
- Added import for `uuid` validation function in InspectionPage component

### Fixed
- Added explicit UUID validation check before using inspection item IDs for photo uploads
- Prevents foreign key violations by ensuring only valid UUIDs are used as inspection_item_id
- Improved robustness of room building logic to handle malformed or invalid inspection item IDs

### Debug Information
- Console logs now show whether inspection item IDs pass UUID validation
- Enhanced error tracking to identify invalid UUIDs before they reach the database

## [2025-01-31] - Enhanced Debugging for Foreign Key Violation

### Added
- Added comprehensive logging to debug foreign key violation in photo uploads
- Added logging in `createInspection` to track inspection item creation
- Added logging in `buildRoomsFromInspectionData` to track item ID mapping
- Added logging in `storage-api` Edge Function to track received parameters
- Enhanced error logging in `storage-api` to show full error details

### Debug Information
- Logs will help identify where invalid inspection_item_id values originate
- Console logs will show the flow from database creation to frontend usage to Edge Function processing
- Error logs will provide detailed information about foreign key constraint violations

## [2025-01-31] - Debug Foreign Key Violation

### Added
- Added comprehensive logging to debug foreign key violation in photo uploads
- Added logging in `createInspection` to track inspection item creation
- Added logging in `buildRoomsFromInspectionData` to track item ID mapping
- Added logging in `storage-api` Edge Function to track received parameters
- Enhanced error logging in `storage-api` to show full error details

### Debug Information
- Logs will help identify where invalid inspection_item_id values originate
- Console logs will show the flow from database creation to frontend usage to Edge Function processing
- Error logs will provide detailed information about foreign key constraint violations

## [2025-01-31] - Photo Upload Fix

### Fixed
- Fixed foreign key constraint violation when uploading photos during inspections
- Resolved "file_metadata_inspection_item_id_fkey" error by ensuring inspection items are properly created
- Enhanced inspection item creation to return database-generated IDs
- Improved room building logic to only use valid inspection item IDs
- Added filtering to exclude rooms without valid inspection items

### Changed
- Modified `createInspection` function to return both inspection and items data
- Updated `buildRoomsFromInspectionData` to require valid inspection item records
- Enhanced error handling for missing inspection items during photo uploads

## [2025-01-31] - Report Access Fix

### Added
- Added `file_key` column to `reports` table to enable secure file access
- Added `getSignedUrlForFile` function in storage.ts for generating pre-signed URLs
- Added loading states for report view/download buttons

### Fixed
- Fixed "AccessDenied" error when viewing/downloading reports from MinIO storage
- Reports now use pre-signed URLs for secure, temporary access to private files
- Enhanced error handling for report access operations
- Improved user experience with loading indicators during file access

### Changed
- Report viewing and downloading now uses secure pre-signed URLs instead of direct file URLs
- Updated report data mapping to include file_key for secure access

## [2025-01-31] - Photo Upload Foreign Key Fix

### Fixed
- Fixed foreign key constraint violation when uploading photos during inspections
- Resolved "file_metadata_inspection_item_id_fkey" error by ensuring inspection items are properly created
- Enhanced inspection item creation to return database-generated IDs
- Improved room building logic to only use valid inspection item IDs
- Added filtering to exclude rooms without valid inspection items
- Fixed database field name mapping (photo_urls vs photoUrls, template_item_id vs templateItemId)

### Changed
- Modified `createInspection` function to return both inspection and items data
- Updated `buildRoomsFromInspectionData` to require valid inspection item records
- Enhanced error handling for missing inspection items during photo uploads
- Improved robustness of template-to-inspection-item mapping

## [2025-01-31] - Database Schema Fix

### Fixed
- Added unique constraint to `storage_usage.admin_id` column to fix "ON CONFLICT specification" error
- Resolved file upload failures in storage-api Edge Function
- Enabled proper storage usage tracking and quota enforcement

## [2025-01-31] - Storage API Fixes

### Fixed
- Fixed MinIO file upload stream type compatibility by converting Web ReadableStream to Node.js Readable stream
- Added proper stream module import for Edge Function compatibility
- Resolved "third argument should be of type \"stream.Readable\"" error in MinIO uploads