# Changelog

## [Latest] - 2025-01-31

### Fixed
- **Database Timeout Issues**: Increased auto-save debounce from 1 to 3 seconds and added timeout protection to prevent database statement timeouts
- **Template Builder Layout**: Reorganized layout to show field types on left, template items in center, and field settings on right
- **Template Builder UI**: Removed "Enable Reporting" checkbox from template builder (now only available during live inspection)
- **Templates Page**: Fixed "Created Invalid Date" display issue with proper date validation
- **Inspection Timer**: Restored working timer functionality showing elapsed time since inspection start
- **Inspection UI**: Enhanced choice button styling with opaque colors for unselected state and full colors when selected
- **Inspection UI**: Reduced button padding to make choice options less wide
- **Inspection Flow**: Fixed divider placement by grouping items by template to ensure single-template inspections stay on one page
- **Inspection UI**: Removed redundant "Save Progress" button from header (kept bottom button)
- **Database Queries**: Fixed missing column errors by removing references to non-existent `parent_id` and `section_name` columns
- **Auto-save**: Implemented debounced auto-save mechanism with improved error handling and change detection

### Technical Improvements
- Added proper error handling for jsPDF text operations
- Improved event target handling in photo upload to prevent null reference errors
- Enhanced inspection item grouping logic to maintain template coherence
- Added defensive date validation throughout the application
- Implemented timeout protection for database operations
- Added change detection to prevent unnecessary database calls

### User Experience
- Inspection items now auto-save with 3-second debounce, reducing database load and timeout errors
- Better visual feedback for choice selections with color-coded options
- More intuitive template builder layout following standard design patterns
- Cleaner inspection interface with reduced UI clutter
- Improved error handling with less intrusive timeout error messages