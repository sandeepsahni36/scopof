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
