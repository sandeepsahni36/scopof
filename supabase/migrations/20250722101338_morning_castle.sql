/*
  # Enhanced Inspections for Real Estate Properties

  1. Schema Changes
    - Rename guest_name to primary_contact_name for broader use cases
    - Rename signature_image_url to primary_contact_signature_url for clarity
    - Add client_present_for_signature boolean for real estate inspections
    - Extend inspection_type enum to include move_in and move_out

  2. New Inspection Types
    - move_in: For real estate move-in inspections
    - move_out: For real estate move-out inspections

  3. Enhanced Contact Management
    - primary_contact_name: Can be guest name (STR) or client name (real estate)
    - client_present_for_signature: Determines if client signature is required
*/

-- Step 1: Rename columns for broader use cases
ALTER TABLE public.inspections RENAME COLUMN guest_name TO primary_contact_name;
ALTER TABLE public.inspections RENAME COLUMN signature_image_url TO primary_contact_signature_url;

-- Step 2: Add client_present_for_signature column
ALTER TABLE public.inspections ADD COLUMN client_present_for_signature BOOLEAN DEFAULT FALSE;

-- Step 3: Extend inspection_type enum to include real estate types
-- Create new enum type with additional values
CREATE TYPE public.inspection_type_new AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');

-- Update the inspections table to use the new enum type
ALTER TABLE public.inspections ALTER COLUMN inspection_type TYPE public.inspection_type_new USING inspection_type::text::public.inspection_type_new;

-- Drop the old enum type
DROP TYPE public.inspection_type;

-- Rename the new enum type to the original name
ALTER TYPE public.inspection_type_new RENAME TO inspection_type;

-- Step 4: Update any existing data to use new column names (data migration)
-- Note: The column renames above handle this automatically

-- Step 5: Add comments for documentation
COMMENT ON COLUMN public.inspections.primary_contact_name IS 'Contact name - Guest name for STR, Client name for real estate';
COMMENT ON COLUMN public.inspections.primary_contact_signature_url IS 'Primary contact signature URL - Guest or client signature';
COMMENT ON COLUMN public.inspections.client_present_for_signature IS 'Whether client is present and signature is required (real estate only)';
COMMENT ON TYPE public.inspection_type IS 'Inspection types: check_in/check_out for STR, move_in/move_out for real estate';