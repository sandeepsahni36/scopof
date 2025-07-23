-- Debug script to create template_items table step by step

-- Step 1: Create the enum type first
DO $$ BEGIN
    CREATE TYPE template_item_type AS ENUM ('divider', 'multiple_choice', 'photo', 'section', 'single_choice', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.template_items CASCADE;

-- Step 3: Create the table with explicit column definitions
CREATE TABLE public.template_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    label text NOT NULL,
    required boolean DEFAULT false,
    options jsonb,
    report_enabled boolean DEFAULT false,
    maintenance_email text,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_id uuid,
    section_name text,
    report_recipient_id uuid,
    type template_item_type NOT NULL
);

-- Step 4: Add primary key
ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);

-- Step 5: Test that the type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'template_items' 
AND table_schema = 'public' 
AND column_name = 'type';