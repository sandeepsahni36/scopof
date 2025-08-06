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