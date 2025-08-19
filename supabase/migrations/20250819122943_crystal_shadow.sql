/*
  # Fix create_demo_templates function with RLS bypass

  1. Problem Resolution
    - Adds `SET LOCAL row_security = off;` to bypass RLS during function execution
    - Ensures all template variables are properly declared
    - Maintains all existing demo template creation logic

  2. Security
    - Uses SECURITY DEFINER to run with elevated privileges
    - RLS bypass is LOCAL to function execution only
    - Does not permanently disable RLS on any tables

  3. Changes
    - Updates create_demo_templates function to bypass RLS temporarily
    - Preserves all existing template and template_item creation logic
    - Ensures proper variable declarations for all template IDs
*/

CREATE OR REPLACE FUNCTION public.create_demo_templates(admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    template_kitchen_id uuid;
    template_bathroom_id uuid;
    template_living_room_id uuid;
    template_bedroom_id uuid;
    template_exterior_id uuid;
    template_general_id uuid;
    template_holiday_homes_id uuid;
BEGIN
    -- Disable RLS for this function execution to allow admin setup
    SET LOCAL row_security = off;
    
    -- Create Kitchen template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'Kitchen', 'Kitchen inspection template', now(), now())
    RETURNING id INTO template_kitchen_id;

    -- Create Bathroom template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'Bathroom', 'Bathroom inspection template', now(), now())
    RETURNING id INTO template_bathroom_id;

    -- Create Living Room template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'Living Room', 'Living room inspection template', now(), now())
    RETURNING id INTO template_living_room_id;

    -- Create Bedroom template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'Bedroom', 'Bedroom inspection template', now(), now())
    RETURNING id INTO template_bedroom_id;

    -- Create Exterior template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'Exterior', 'Exterior inspection template', now(), now())
    RETURNING id INTO template_exterior_id;

    -- Create General template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'General', 'General inspection template', now(), now())
    RETURNING id INTO template_general_id;

    -- Create Holiday Homes template
    INSERT INTO public.templates (id, admin_id, category_id, name, description, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, null, 'Holiday Homes', 'Comprehensive holiday home inspection template', now(), now())
    RETURNING id INTO template_holiday_homes_id;

    -- Insert Template Items for Kitchen
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Refrigerator', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Refrigerator Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Oven', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 4),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Oven Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Microwave', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 7),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Microwave Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 9),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Dishwasher', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 10),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Dishwasher Photo', false, null, false, null, 11),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 12),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Kitchen Sink', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 13),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Kitchen Sink Photo', false, null, false, null, 14),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 15),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Kitchen Cabinets', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 16),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Kitchen Cabinets Photo', false, null, false, null, 17),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 18),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Kitchen Countertops', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 19),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Kitchen Countertops Photo', false, null, false, null, 20),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 21);

    -- Insert Template Items for Bathroom
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Shower', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Shower Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Bathtub', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 4),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Bathtub Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Toilet', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 7),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Toilet Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 9),
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Bathroom Sink', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 10),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Bathroom Sink Photo', false, null, false, null, 11),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 12),
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Bathroom Mirror', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 13),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Bathroom Mirror Photo', false, null, false, null, 14),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 15),
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Bathroom Cabinet', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 16),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Bathroom Cabinet Photo', false, null, false, null, 17),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 18),
    (gen_random_uuid(), template_bathroom_id, 'single_choice', 'Bathroom Tiles', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 19),
    (gen_random_uuid(), template_bathroom_id, 'photo', 'Bathroom Tiles Photo', false, null, false, null, 20),
    (gen_random_uuid(), template_bathroom_id, 'divider', '', false, null, false, null, 21);

    -- Insert Template Items for Living Room
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Sofa', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 1),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Sofa Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Coffee Table', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 4),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Coffee Table Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'TV', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 7),
    (gen_random_uuid(), template_living_room_id, 'photo', 'TV Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 9),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Air Conditioning', false, '[{"color":"#22C55E","label":"Working"},{"color":"#EF4444","label":"Not Working"}]', false, null, 10),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Air Conditioning Photo', false, null, false, null, 11),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 12);

    -- Insert Template Items for Bedroom
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Bed', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 1),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Bed Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Wardrobe', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 4),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Wardrobe Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Bedside Tables', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 7),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Bedside Tables Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 9);

    -- Insert Template Items for Exterior
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_exterior_id, 'single_choice', 'Balcony', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 1),
    (gen_random_uuid(), template_exterior_id, 'photo', 'Balcony Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_exterior_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_exterior_id, 'single_choice', 'Garden', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 4),
    (gen_random_uuid(), template_exterior_id, 'photo', 'Garden Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_exterior_id, 'divider', '', false, null, false, null, 6);

    -- Insert Template Items for General
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_general_id, 'text', 'Overall Notes', false, null, false, null, 1),
    (gen_random_uuid(), template_general_id, 'photo', 'General Photo', false, null, false, null, 2);

    -- Insert Template Items for Holiday Homes (comprehensive template)
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Property Exterior Condition', true, '[{"color":"#22C55E","label":"Excellent"},{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Poor"},{"color":"#EF4444","label":"Damaged"}]', false, null, 1),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Property Exterior Photos', true, null, false, null, 2),
    (gen_random_uuid(), template_holiday_homes_id, 'text', 'Exterior Notes', false, null, false, null, 3),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 4),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Entry Door & Locks', true, '[{"color":"#22C55E","label":"Working"},{"color":"#EF4444","label":"Not Working"},{"color":"#EF4444","label":"Damaged"}]', false, null, 5),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Entry Door Photos', true, null, false, null, 6),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 7),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Windows & Blinds', true, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Minor Issues"},{"color":"#EF4444","label":"Major Issues"}]', false, null, 8),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Windows Photos', false, null, false, null, 9),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 10),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Living Area Furniture', true, '[{"color":"#22C55E","label":"Excellent"},{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Poor"}]', false, null, 11),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Living Area Photos', true, null, false, null, 12),
    (gen_random_uuid(), template_holiday_homes_id, 'text', 'Living Area Notes', false, null, false, null, 13),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 14),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Kitchen Appliances', true, '[{"color":"#22C55E","label":"All Working"},{"color":"#F97316","label":"Some Issues"},{"color":"#EF4444","label":"Major Problems"}]', false, null, 15),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Kitchen Photos', true, null, false, null, 16),
    (gen_random_uuid(), template_holiday_homes_id, 'multiple_choice', 'Kitchen Items Present', false, '[{"color":"#22C55E","label":"Refrigerator"},{"color":"#22C55E","label":"Oven"},{"color":"#22C55E","label":"Microwave"},{"color":"#22C55E","label":"Dishwasher"},{"color":"#22C55E","label":"Coffee Machine"},{"color":"#22C55E","label":"Toaster"}]', false, null, 17),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 18),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Bathroom Condition', true, '[{"color":"#22C55E","label":"Clean & Functional"},{"color":"#F97316","label":"Needs Cleaning"},{"color":"#EF4444","label":"Maintenance Required"}]', false, null, 19),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Bathroom Photos', true, null, false, null, 20),
    (gen_random_uuid(), template_holiday_homes_id, 'multiple_choice', 'Bathroom Fixtures Working', false, '[{"color":"#22C55E","label":"Shower"},{"color":"#22C55E","label":"Toilet"},{"color":"#22C55E","label":"Sink"},{"color":"#22C55E","label":"Hot Water"}]', false, null, 21),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 22),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Bedroom Condition', true, '[{"color":"#22C55E","label":"Ready for Guests"},{"color":"#F97316","label":"Needs Preparation"},{"color":"#EF4444","label":"Not Ready"}]', false, null, 23),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Bedroom Photos', true, null, false, null, 24),
    (gen_random_uuid(), template_holiday_homes_id, 'number', 'Number of Beds', false, null, false, null, 25),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 26),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'WiFi & Entertainment', false, '[{"color":"#22C55E","label":"Working"},{"color":"#EF4444","label":"Not Working"},{"color":"#F97316","label":"Partial Issues"}]', false, null, 27),
    (gen_random_uuid(), template_holiday_homes_id, 'text', 'WiFi Password & Instructions', false, null, false, null, 28),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 29),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Cleanliness Standard', true, '[{"color":"#22C55E","label":"Excellent"},{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Acceptable"},{"color":"#EF4444","label":"Below Standard"}]', false, null, 30),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Overall Cleanliness Photos', false, null, false, null, 31),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 32),
    (gen_random_uuid(), template_holiday_homes_id, 'multiple_choice', 'Amenities Available', false, '[{"color":"#22C55E","label":"Pool"},{"color":"#22C55E","label":"Gym"},{"color":"#22C55E","label":"Parking"},{"color":"#22C55E","label":"Balcony"},{"color":"#22C55E","label":"Garden"},{"color":"#22C55E","label":"BBQ Area"}]', false, null, 33),
    (gen_random_uuid(), template_holiday_homes_id, 'photo', 'Amenities Photos', false, null, false, null, 34),
    (gen_random_uuid(), template_holiday_homes_id, 'divider', '', false, null, false, null, 35),
    (gen_random_uuid(), template_holiday_homes_id, 'text', 'Guest Instructions & Welcome Notes', false, null, false, null, 36),
    (gen_random_uuid(), template_holiday_homes_id, 'text', 'Maintenance Issues Found', false, null, false, null, 37),
    (gen_random_uuid(), template_holiday_homes_id, 'single_choice', 'Ready for Next Guest', true, '[{"color":"#22C55E","label":"Yes - Ready"},{"color":"#F97316","label":"Minor Prep Needed"},{"color":"#EF4444","label":"Major Prep Required"}]', false, null, 38);

    RAISE NOTICE 'Demo templates created successfully for admin: %', admin_id;
END;
$function$;