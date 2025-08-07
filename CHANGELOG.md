## [Unreleased]

### Added
- Added in-inspection reporting functionality allowing inspectors to mark items for email alerts during inspections
- Added "Mark for Report" checkbox for each inspection item with flag icon and descriptive text
- Added new Supabase Edge Function `send-inspection-report-email` to handle automated email notifications
- Added `marked_for_report` column to `inspection_items` table for tracking flagged items
- Added automatic email sending when inspections are completed for all marked items
- Added comprehensive email templates with inspection and item details for report recipients

### Changed
- Removed "Enable Reporting" checkbox from template editor - reporting decisions now made during inspections
- Removed report recipient selection from template creation - uses existing template report_recipient_id
- Email notifications now sent from `inspection-alerts@scopostay.com` with `noreply@scopostay.com` reply-to
- Email subject format: "scopoStay Inspection Item (Property Name, Date, Item name)"
- Inspection completion now triggers automatic email alerts for flagged items

### Technical Details
- New database column: `inspection_items.marked_for_report` (boolean, default false)
- New Edge Function: `send-inspection-report-email` using Resend API
- Email templates include property details, inspection info, and specific item details
- Automatic email sending integrated into inspection completion workflow
- Enhanced inspection item update function to handle marked_for_report field

### Fixed
- Fixed file deletion order in inspection deletion to prevent "File not found" errors
- Fixed property date display showing "Invalid Date" by properly mapping database snake_case fields to camelCase
- Applied date field mapping to all property operations (get, create, update)

## [2025-01-31] - Fix Property Date Display in Detail View

### Fixed
- Fixed "Invalid Date" display on property detail page by applying `mapDbPropertyToProperty` transformation to `getProperty` function
- Fixed date mapping in `getProperties` function to ensure all property lists show correct dates
- Ensured all property CRUD operations consistently transform database snake_case fields to frontend camelCase fields

### Technical Details
- `getProperty` function now applies `mapDbPropertyToProperty` transformation to single property responses
- `getProperties` function now maps all properties in the array using the transformation function
- All property operations now consistently return properly formatted Property objects with valid date strings

## [2025-01-31] - Fix Property Creation Date Display

### Fixed
- Fixed "Invalid Date" display for newly created properties by ensuring proper null checking in `createProperty` function
- Fixed `createProperty` function to safely apply `mapDbPropertyToProperty` transformation with null checking
- Ensured all property operations (get, create, update) consistently return properly formatted Property objects

### Technical Details
- `createProperty` function now safely applies `mapDbPropertyToProperty` transformation with null checking
- All property CRUD operations now consistently map snake_case database fields to camelCase frontend fields
- Date fields (`created_at` -> `createdAt`, `updated_at` -> `updatedAt`) are properly transformed for all operations

## [2025-01-31] - Fix Property Creation Date Display

### Fixed
- Fixed "Invalid Date" display for newly created properties by applying date mapping in `createProperty` function
- Fixed `createProperty` function to properly transform database response using `mapDbPropertyToProperty` helper
- Ensured all property operations (get, create, update) consistently return properly formatted Property objects

### Technical Details
- `createProperty` function now applies `mapDbPropertyToProperty` transformation to database response
- All property CRUD operations now consistently map snake_case database fields to camelCase frontend fields
- Date fields (`created_at` -> `createdAt`, `updated_at` -> `updatedAt`) are properly transformed for all operations

## [2025-01-31] - Fix Property Date Display Issues

### Fixed
- Fixed "Invalid Date" display for "Date Added" and "Last Updated" fields on property detail page
- Fixed database field mapping between snake_case (database) and camelCase (frontend) for property dates
- Added proper data transformation in properties library to map `created_at` to `createdAt` and `updated_at` to `updatedAt`
- Fixed date mapping for all property operations (get, create, update) to ensure consistent date handling

### Added
- Added `mapDbPropertyToProperty` helper function to transform database responses to frontend Property type
- Added consistent date field mapping across all property API functions

### Changed
- Property data now properly maps database snake_case fields to frontend camelCase fields
- All property operations now return properly formatted Property objects with valid date strings
- Date display on property detail page now shows actual creation and modification dates

### Technical Details
- Database stores dates as `created_at` and `updated_at` (snake_case)
- Frontend Property type expects `createdAt` and `updatedAt` (camelCase)
- Added transformation layer in properties library to handle this mapping consistently
- All property CRUD operations now use the mapping function to ensure data consistency

## [2025-01-31] - Fix Property Edit Functionality and Mobile Navigation

### Fixed
- Fixed "Edit" button on property detail page to open the actual property edit form instead of showing placeholder message
- Fixed property form integration on property detail page with proper state management
- Fixed property data updates to reflect changes immediately after editing
- Fixed mobile bottom navigation text truncation and spacing issues
- Fixed dropdown menu positioning on property cards with proper z-index layering

### Added
- Added complete property edit functionality on property detail page using existing PropertyForm component
- Added proper form submission handling with success/error feedback
- Added loading states for property form operations
- Added form cancellation handling to close modal without saving changes

### Changed
- Property detail page "Edit" button now opens the same edit form as the properties list page
- Property form modal properly updates the property data and refreshes the detail view
- Mobile navigation text uses improved spacing and truncation for better readability
- Dropdown menus now use higher z-index values to appear above all other content

### Technical Details
- Integrated PropertyForm component into PropertyDetailPage with proper state management
- Property updates now refresh the local state to show changes immediately
- Form submission uses the existing updateProperty API function
- Mobile navigation improved with better text handling and spacing
- Dropdown positioning fixed with proper z-index hierarchy

## [2025-08-06] - Implement Mobile-First Bottom Navigation

### Added
- Added `BottomNavigation` component for mobile devices with fixed bottom positioning
- Added responsive navigation that shows sidebar on desktop and bottom navigation on mobile
- Added proper mobile spacing with `pb-16` to prevent content overlap with bottom navigation
- Added responsive margin classes (`md:ml-20`, `md:ml-64`) for desktop sidebar positioning
- Added truncated text handling for navigation labels to prevent overflow on small screens

### Changed
- Desktop sidebar now hidden on mobile screens using `hidden md:flex md:flex-col` classes
- Main content area now uses responsive margins that only apply on medium screens and above
- Mobile navigation shows only essential items (Dashboard, Properties, Templates, Reports, Settings, Subscription)
- Navigation items in bottom bar use `flex-1` and `min-w-0` for equal spacing and text truncation
- Removed inline styles in favor of Tailwind responsive classes for better maintainability

### Fixed
- Fixed mobile navigation accessibility by moving menu to thumb-friendly bottom position
- Fixed content overlap issues by adding proper padding-bottom on mobile
- Fixed navigation item spacing to prevent overcrowding on small screens
- Fixed responsive layout to properly hide/show navigation based on screen size

### Technical Details
- Bottom navigation uses `fixed bottom-0` positioning with `z-50` for proper layering
- Desktop sidebar maintains existing collapse/expand functionality
- Mobile navigation automatically adapts to admin status (shows admin items when applicable)
- Responsive classes ensure smooth transition between mobile and desktop layouts
- Navigation items use `truncate` class to handle long text gracefully on small screens

## [2025-08-06] - Implement Mobile-First Bottom Navigation and Fix Responsive Issues

### Added
- Added `BottomNavigation` component for mobile devices with fixed bottom positioning
- Added responsive navigation that shows sidebar on desktop and bottom navigation on mobile
- Added proper mobile spacing with `pb-16` to prevent content overlap with bottom navigation
- Added responsive margin classes (`md:ml-20`, `md:ml-64`) for desktop sidebar positioning
- Added truncated text handling for navigation labels to prevent overflow on small screens
- Added header to StartInspectionPage with back button and app branding

### Changed
- Desktop sidebar now hidden on mobile screens using `hidden md:flex md:flex-col` classes
- Main content area now uses responsive margins that only apply on medium screens and above
- Mobile navigation shows only essential items (Dashboard, Properties, Templates, Reports, Settings, Subscription)
- Navigation items in bottom bar use `flex-1` and `min-w-0` for equal spacing and text truncation
- Removed inline styles in favor of Tailwind responsive classes for better maintainability
- StartInspectionPage now has proper header with navigation instead of floating back button

### Fixed
- Fixed mobile navigation accessibility by moving menu to thumb-friendly bottom position
- Fixed content overlap issues by adding proper padding-bottom on mobile
- Fixed navigation item spacing to prevent overcrowding on small screens
- Fixed responsive layout to properly hide/show navigation based on screen size
- Fixed horizontal scrolling on Reports page by making filter grid responsive
- Fixed horizontal scrolling on Subscription page by making pricing grid responsive
- Fixed horizontal scrolling on Templates page by ensuring full-width inputs
- Fixed horizontal scrolling on Property Detail page by wrapping tables in overflow containers
- Fixed desktop sidebar overlap by maintaining proper margin-left on main content
- Fixed bottom navigation background to be solid white instead of transparent
- Fixed bottom navigation size fluctuation by using fixed height and flex distribution

### Technical Details
- Bottom navigation uses `fixed bottom-0` positioning with `z-50` for proper layering
- Desktop sidebar maintains existing collapse/expand functionality
- Mobile navigation automatically adapts to admin status (shows admin items when applicable)
- Responsive classes ensure smooth transition between mobile and desktop layouts
- Navigation items use `truncate` class to handle long text gracefully on small screens
- Tables wrapped in `overflow-x-auto` containers for horizontal scrolling when needed
- StartInspectionPage redesigned with proper header structure for better mobile UX

## [2025-08-06] - Comprehensive Fix for Photo Preview and PDF Embedding Issues

### Fixed
- Completely removed all `cleanCompanyName` and related variable references from frontend PDF generation code
- Fixed `ReferenceError: cleanCompanyName is not defined` that was preventing PDF generation from completing
- Enhanced logging in `getSignedUrlForFile` function to track the complete signed URL generation process
- Added detailed error logging and response tracking for storage API calls
- Fixed photo preview loading by ensuring proper signed URL generation debugging

### Added
- Comprehensive logging in `getSignedUrlForFile` to track user authentication, session tokens, and API responses
- Enhanced error handling with detailed logging for authentication failures
- Added response header logging for storage API calls to debug access issues
- Added JSON parsing logging to track successful vs failed API responses
- Added targeted debug logging before `getSignedUrlForFile` calls to confirm fileKey values

### Debug Information
- Console logs now show complete flow from fileKey extraction to signed URL generation
- Enhanced error messages provide specific details about API response failures
- Authentication error handling includes detailed logging for troubleshooting
- Response data validation logs help identify malformed API responses

### Technical Details
- Removed all frontend references to backend-specific variables (cleanCompanyName, objectName construction)
- Enhanced `getSignedUrlForFile` with step-by-step logging for debugging signed URL failures
- Added comprehensive error tracking throughout the photo processing pipeline
- Fixed PDF generation by removing misplaced backend logic from frontend code

## [2025-08-06] - Fix Camera Photo Preview and PDF Embedding Issues

### Fixed
- Fixed ReferenceError: cleanCompanyName is not defined in PDF generation by removing misplaced backend logic from frontend code
- Fixed fileKey extraction in storage-api Edge Function by correcting path segment slicing from slice(2) to slice(4)
- Resolved signed URL generation failures for camera photos by properly parsing the request URL structure
- Fixed photo preview loading by ensuring correct file keys are passed to MinIO for presigned URL generation
- Removed erroneous objectName construction logic from frontend PDF generation function

### Added
- Added comprehensive logging in extractFileKeyFromUrl function to track URL parsing and file key extraction
- Added detailed photo preview processing logs to track signed URL generation success/failure
- Added specific error logging for file key extraction failures in both download and delete endpoints
- Added validation logging for URL structure and path parsing in storage API
- Added critical debug logging to track fileKey values before signed URL generation attempts

### Debug Information
- Console logs now show complete URL parsing process including hostname, pathname, and path parts
- File key extraction logs show bucket index detection and path reconstruction
- Photo preview logs track the complete flow from database URL to signed URL generation
- Enhanced error messages provide specific details about URL parsing failures in storage API
- Critical debug logs show fileKey type, value, and truthiness before processing

### Technical Details
- Fixed storage-api Edge Function to correctly extract file keys from Supabase function URLs
- URL structure: /functions/v1/storage-api/download/{fileKey} requires slice(4) not slice(2)
- Removed frontend objectName construction that was causing ReferenceError crashes
- Enhanced logging throughout photo processing pipeline for better debugging
- File key extraction now properly handles nested MinIO folder structures

## [2025-08-06] - Fix Camera Photo Preview and PDF Embedding Issues

### Fixed
- Fixed ReferenceError: cleanCompanyName is not defined in PDF generation by removing misplaced backend logic from frontend code
- Enhanced file key extraction logging to debug why signed URLs are not being generated for camera photos
- Added comprehensive logging to track photo URL processing from database storage to signed URL generation
- Improved error handling and debugging output for photo preview failures

### Added
- Added detailed logging in extractFileKeyFromUrl function to track URL parsing and file key extraction
- Added enhanced photo preview processing logs to track signed URL generation success/failure
- Added specific error logging for file key extraction failures
- Added validation logging for URL structure and path parsing

### Debug Information
- Console logs now show complete URL parsing process including hostname, pathname, and path parts
- File key extraction logs show bucket index detection and path reconstruction
- Photo preview logs track the complete flow from database URL to signed URL generation
- Enhanced error messages provide specific details about URL parsing failures

### Technical Details
- Removed erroneous cleanCompanyName variable reference that was causing PDF generation crashes
- Enhanced extractFileKeyFromUrl function with step-by-step logging for debugging
- Photo preview processing now logs each step of the signed URL generation pipeline
- Error handling improved to capture and log specific failure points in photo processing

## [2025-01-31] - Enhanced Debugging for Camera Photo Issues

### Added
- Added comprehensive logging throughout the camera photo pipeline to debug preview and PDF embedding failures
- Added WebP conversion logging to track file type, size, and header validation
- Added storage API upload/download logging to trace file URLs and signed URL generation
- Added photo preview error logging with detailed image element analysis
- Added PDF image processing logging to track fetch, blob conversion, and canvas operations
- Added MinIO presigned URL generation logging with URL structure analysis
- Added file key extraction debugging with URL path analysis

### Debug Information
- WebP conversion logs original vs converted file details and validates file headers
- Storage API logs track file upload success and response data structure
- Signed URL generation logs trace the complete URL creation process
- Photo preview logs capture image loading failures with element state details
- PDF embedding logs track image fetch, blob processing, and canvas conversion steps
- Enhanced error logging throughout the entire photo processing pipeline

### Technical Details
- WebP file header validation checks for proper RIFF signature
- File URL analysis validates URL structure and MinIO bucket references
- Presigned URL validation checks for proper expiry parameters and HTTPS protocol
- Canvas processing logs track image scaling and data URL generation
- Comprehensive error capture at every stage of photo processing workflow

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