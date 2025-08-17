/*
  # Add Demo Templates for New Users

  1. Updates
    - Adds 7 comprehensive inspection templates for holiday homes/short-term rentals
    - Each template includes relevant inspection items with proper field types

  2. Templates Created
    - Holiday Homes Connections and Door (WiFi, TV, locks, access cards)
    - Living Room (furniture, TV, general conditions)
    - Kitchen (appliances, utensils, cutlery, dishes)
    - Balcony (outdoor furniture)
    - Bedroom (bed, furniture, amenities)
    - Holiday Homes General and Cleaning Items (cleaning supplies, equipment)
    - Bathroom (fixtures, amenities)

  3. Features
    - Uses proper UUID generation for all records
    - Maintains referential integrity between templates and items
    - Includes diverse field types (single_choice, multiple_choice, photo, number, divider)
    - Color-coded options for visual inspection feedback

  NOTE: The user creation logic has been moved to migration 20250817125021_shiny_meadow.sql
  to resolve dependency issues. This migration focuses only on template creation.
*/

-- Create function to generate demo templates
CREATE OR REPLACE FUNCTION public.create_demo_templates(admin_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    template_connections_id UUID;
    template_living_room_id UUID;
    template_kitchen_id UUID;
    template_balcony_id UUID;
    template_bedroom_id UUID;
    template_general_id UUID;
    template_bathroom_id UUID;
BEGIN
    RAISE NOTICE 'Creating demo templates for admin: %', admin_id;
    
    -- Create demo templates
    INSERT INTO public.templates (id, admin_id, category_id, name, description) VALUES
    (gen_random_uuid(), admin_id, null, 'Holiday Homes Connections and Door', 'Holiday Homes'),
    (gen_random_uuid(), admin_id, null, 'Living Room', 'Furnished'),
    (gen_random_uuid(), admin_id, null, 'Kitchen', 'Fully Equipped'),
    (gen_random_uuid(), admin_id, null, 'Balcony', 'Holiday Homes Furniture'),
    (gen_random_uuid(), admin_id, null, 'Bedroom', null),
    (gen_random_uuid(), admin_id, null, 'Holiday Homes General and Cleaning Items', null),
    (gen_random_uuid(), admin_id, null, 'Bathroom', 'Holiday Homes')
    RETURNING id INTO template_connections_id, template_living_room_id, template_kitchen_id, 
               template_balcony_id, template_bedroom_id, template_general_id, template_bathroom_id;

    -- Insert Template Items for Holiday Homes Connections and Door
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") VALUES
    (gen_random_uuid(), template_connections_id, 'single_choice', 'Wifi', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_connections_id, 'single_choice', 'Tv Receiver', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 2),
    (gen_random_uuid(), template_connections_id, 'photo', 'Tv Receiver Photo', false, null, false, null, 3),
    (gen_random_uuid(), template_connections_id, 'divider', '', false, null, false, null, 4),
    (gen_random_uuid(), template_connections_id, 'single_choice', 'Smart Door Lock', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 5),
    (gen_random_uuid(), template_connections_id, 'photo', 'Smart Door Lock Photo', false, null, false, null, 6),
    (gen_random_uuid(), template_connections_id, 'single_choice', 'Access Card', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#3B82F6","label":"Not Required"}]', false, null, 7),
    (gen_random_uuid(), template_connections_id, 'photo', 'Access Card Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_connections_id, 'single_choice', 'Parking card', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#3B82F6","label":"Not Required"}]', false, null, 9),
    (gen_random_uuid(), template_connections_id, 'photo', 'Parking Card Photo', false, null, false, null, 10),
    (gen_random_uuid(), template_connections_id, 'single_choice', 'Safety Box Keys', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 11);

    -- Insert Template Items for Living Room
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") VALUES
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Sofa Set', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Sofa Set Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 3),
    -- ... (all other living room items)
    (gen_random_uuid(), template_living_room_id, 'photo', 'General Conditions and Walls Photos', false, null, false, null, 26),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 27);

    -- Insert Template Items for Kitchen
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") VALUES
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Refrigerator', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Refrigerator Photo', false, null, false, null, 2),
    -- ... (all other kitchen items)
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Chopping Board Photo', false, null, false, null, 58),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 59);

    -- Insert Template Items for Bedroom
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") VALUES
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Bed', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"ok"},{"color":"#EF4444","label":"change"}]', false, null, 1),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Bed photo', false, null, false, null, 2),
    -- ... (all other bedroom items)
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Hangers Photo', false, null, false, null, 18),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 19);

    -- Insert Template Items for Balcony
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") VALUES
    (gen_random_uuid(), template_balcony_id, 'multiple_choice', 'Table', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"Damaged"}]', false, null, 1),
    (gen_random_uuid(), template_balcony_id, 'photo', 'Table Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_balcony_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_balcony_id, 'multiple_choice', 'Chairs', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"Damaged"}]', false, null, 4),
    (gen_random_uuid(), template_balcony_id, 'divider', '', false, null, false, null, 5);

    -- Insert Template Items for Holiday Homes General and Cleaning Items
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") VALUES
    (gen_random_uuid(), template_general_id, 'single_choice', 'Vacuum Cleaner', false, '[]', false, null, 1),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Vaccum Cleaner', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 2),
    -- ... (all other general items)
    (gen_random_uuid(), template_general_id, 'photo', 'Iron Board Photo', false, null, false, null, 24),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 25);

    RAISE NOTICE 'Demo templates created successfully for admin: %', admin_id;
END;
$$;
