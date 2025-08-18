/*
  # Fix create_demo_templates function

  1. Function Update
    - Fix the multi-row INSERT issue that was causing "query returned more than one row" error
    - Break down the single INSERT with multiple VALUES into individual INSERT statements
    - Each INSERT now properly returns a single ID into its respective variable
    
  2. Changes Made
    - Replace single multi-row INSERT with 7 individual INSERT statements for templates
    - Each template INSERT uses its own RETURNING id INTO variable clause
    - Maintain all existing template items and structure
    - Keep all logging and error handling intact

  3. Templates Created
    - Holiday Homes Connections and Door
    - Living Room (Furnished)
    - Kitchen (Fully Equipped)
    - Balcony (Holiday Homes Furniture)
    - Bedroom
    - Holiday Homes General and Cleaning Items
    - Bathroom (Holiday Homes)
*/

-- Create or replace the create_demo_templates function with fixed INSERT statements
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
    
    -- Create demo templates (individual INSERT statements to fix the multi-row issue)
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Holiday Homes Connections and Door', 'Holiday Homes')
    RETURNING id INTO template_connections_id;
    
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Living Room', 'Furnished')
    RETURNING id INTO template_living_room_id;
    
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Kitchen', 'Fully Equipped')
    RETURNING id INTO template_kitchen_id;
    
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Balcony', 'Holiday Homes Furniture')
    RETURNING id INTO template_balcony_id;
    
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Bedroom', null)
    RETURNING id INTO template_bedroom_id;
    
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Holiday Homes General and Cleaning Items', null)
    RETURNING id INTO template_general_id;
    
    INSERT INTO public.templates (id, admin_id, category_id, name, description) 
    VALUES (gen_random_uuid(), admin_id, null, 'Bathroom', 'Holiday Homes')
    RETURNING id INTO template_bathroom_id;

    RAISE NOTICE 'Demo templates created successfully';

    -- Insert Template Items for Holiday Homes Connections and Door
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
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
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Sofa Set', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Sofa Set Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Dining Table', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 4),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Dining Table Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Dining Chairs', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 7),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Dining Chairs Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 9),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'TV', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 10),
    (gen_random_uuid(), template_living_room_id, 'photo', 'TV Photo', false, null, false, null, 11),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 12),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'TV Station', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 13),
    (gen_random_uuid(), template_living_room_id, 'photo', 'TV Station Photo', false, null, false, null, 14),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 15),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Carpet / Rug', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 16),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Carpet / Rug Photo', false, null, false, null, 17),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 18),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Pot and Plant', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 19),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Pot and Plant Photo', false, null, false, null, 20),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 21),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'Coffee Table', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 22),
    (gen_random_uuid(), template_living_room_id, 'photo', 'Coffee Table Photo', false, null, false, null, 23),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 24),
    (gen_random_uuid(), template_living_room_id, 'single_choice', 'General Conditions and Walls', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Fair"},{"color":"#EF4444","label":"Bad"}]', false, null, 25),
    (gen_random_uuid(), template_living_room_id, 'photo', 'General Conditions and Walls Photos', false, null, false, null, 26),
    (gen_random_uuid(), template_living_room_id, 'divider', '', false, null, false, null, 27);

    -- Insert Template Items for Kitchen
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Refrigerator', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 1),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Refrigerator Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Oven', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#3B82F6","label":"Only Stove Top"}]', false, null, 4),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Oven Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Washing Machine', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 7),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Washing Machine Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 9),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Kitchen Hood Exhaust', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 10),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Kitchen Hood Exhaust Photo', false, null, false, null, 11),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 12),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Toaster', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 13),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Toaster Photo', false, null, false, null, 14),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 15),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Electric Kettle', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 16),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Electric Kettle Photo', false, null, false, null, 17),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 18),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Microwave', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 19),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Microwave Photo', false, null, false, null, 20),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 21),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Kitchen Utensils', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 22),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Kitchen Utensils Photo', false, null, false, null, 23),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 24),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Cutleries', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 25),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Spoons', false, null, false, null, 26),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Forks', false, null, false, null, 27),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Dinner Knives', false, null, false, null, 28),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Cutleries Photo', false, null, false, null, 29),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 30),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Knife Block Set', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"},{"color":"#3B82F6","label":"Pieces Missing"}]', false, null, 31),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Knife Block Set Photo', false, null, false, null, 32),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 33),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Dinner Plates', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 34),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Dinner Plates', false, null, false, null, 35),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Dinner Plates Photo', false, null, false, null, 36),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 37),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Side Plates', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 38),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Side Plates', false, null, false, null, 39),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Side Plates Photo', false, null, false, null, 40),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 41),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Bowls', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 42),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Bowls', false, null, false, null, 43),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Bowls Photo', false, null, false, null, 44),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 45),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Wine Glass', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 46),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Wine Glasses', false, null, false, null, 47),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Wine Glass Photo', false, null, false, null, 48),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 49),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Water Glass', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 50),
    (gen_random_uuid(), template_kitchen_id, 'number', 'Number of Water Glasses', false, null, false, null, 51),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Water Glass Photo', false, null, false, null, 52),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 53),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Trashbin', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 54),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Trashbin Photo', false, null, false, null, 55),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 56),
    (gen_random_uuid(), template_kitchen_id, 'single_choice', 'Chopping Board', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 57),
    (gen_random_uuid(), template_kitchen_id, 'photo', 'Chopping Board Photo', false, null, false, null, 58),
    (gen_random_uuid(), template_kitchen_id, 'divider', '', false, null, false, null, 59);

    -- Insert Template Items for Bedroom
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Bed', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"ok"},{"color":"#EF4444","label":"change"}]', false, null, 1),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Bed photo', false, null, false, null, 2),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Night Stand', false, '[{"color":"#22C55E","label":"Good"},{"color":"#F97316","label":"Satisfactory"},{"color":"#EF4444","label":"Poor"}]', false, null, 4),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Night Stand Photo', false, null, false, null, 5),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 6),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Dresser Table', false, '[{"color":"#22C55E","label":"Good"},{"color":"#3B82F6","label":"Satisfactory"},{"color":"#EF4444","label":"Poor"},{"color":"#F97316","label":"Not Available"}]', false, null, 7),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Dresser Table Photo', false, null, false, null, 8),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 9),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Dresser Chair/Stool', false, '[{"color":"#22C55E","label":"Good"},{"color":"#3B82F6","label":"Satisfactory"},{"color":"#EF4444","label":"Poor"},{"color":"#F97316","label":"Not Available"}]', false, null, 10),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Dresser Chair/Stool Photo', false, null, false, null, 11),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 12),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Wall Art/Pictures', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 13),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Wall Art/Pictures Photo', false, null, false, null, 14),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 15),
    (gen_random_uuid(), template_bedroom_id, 'single_choice', 'Hangers', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"}]', false, null, 16),
    (gen_random_uuid(), template_bedroom_id, 'number', 'Number of Hangers', false, null, false, null, 17),
    (gen_random_uuid(), template_bedroom_id, 'photo', 'Hangers Photo', false, null, false, null, 18),
    (gen_random_uuid(), template_bedroom_id, 'divider', '', false, null, false, null, 19);

    -- Insert Template Items for Balcony
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_balcony_id, 'multiple_choice', 'Table', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"Damaged"}]', false, null, 1),
    (gen_random_uuid(), template_balcony_id, 'photo', 'Table Photo', false, null, false, null, 2),
    (gen_random_uuid(), template_balcony_id, 'divider', '', false, null, false, null, 3),
    (gen_random_uuid(), template_balcony_id, 'multiple_choice', 'Chairs', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"Damaged"}]', false, null, 4),
    (gen_random_uuid(), template_balcony_id, 'divider', '', false, null, false, null, 5);

    -- Insert Template Items for Holiday Homes General and Cleaning Items
    INSERT INTO public.template_items (id, template_id, type, label, required, options, report_enabled, maintenance_email, "order") 
    VALUES
    (gen_random_uuid(), template_general_id, 'single_choice', 'Vacuum Cleaner', false, '[]', false, null, 1),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Vaccum Cleaner', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 2),
    (gen_random_uuid(), template_general_id, 'photo', 'Vaccum Cleaner Photo', false, null, false, null, 3),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 4),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Hair Dryer', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 5),
    (gen_random_uuid(), template_general_id, 'photo', 'Hair Dryer Photo', false, null, false, null, 6),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 7),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Clothes Dry Rack', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 8),
    (gen_random_uuid(), template_general_id, 'photo', 'Clothes Dry Rack Photo', false, null, false, null, 9),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 10),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Mop & Bucket', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 11),
    (gen_random_uuid(), template_general_id, 'photo', 'Mop & Bucket Photo', false, null, false, null, 12),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 13),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Broom & Dustpan', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 14),
    (gen_random_uuid(), template_general_id, 'photo', 'Broom & Dustpan Photo', false, null, false, null, 15),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 16),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Prayer Mat', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 17),
    (gen_random_uuid(), template_general_id, 'photo', 'Prayer Mat Photo', false, null, false, null, 18),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 19),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Iron', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 20),
    (gen_random_uuid(), template_general_id, 'photo', 'Iron Photo', false, null, false, null, 21),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 22),
    (gen_random_uuid(), template_general_id, 'multiple_choice', 'Iron Board', false, '[{"color":"#22C55E","label":"Yes"},{"color":"#EF4444","label":"No"},{"color":"#F97316","label":"To Replace"}]', false, null, 23),
    (gen_random_uuid(), template_general_id, 'photo', 'Iron Board Photo', false, null, false, null, 24),
    (gen_random_uuid(), template_general_id, 'divider', '', false, null, false, null, 25);

    RAISE NOTICE 'Demo templates created successfully for admin: %', admin_id;
END;
$$;