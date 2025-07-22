```sql
-- Drop existing foreign key constraints that might reference template_items
ALTER TABLE IF EXISTS public.inspection_items DROP CONSTRAINT IF EXISTS inspection_items_template_item_id_fkey;
ALTER TABLE IF EXISTS public.template_items DROP CONSTRAINT IF EXISTS template_items_parent_id_fkey;
ALTER TABLE IF EXISTS public.template_items DROP CONSTRAINT IF EXISTS template_items_report_recipient_id_fkey;
ALTER TABLE IF EXISTS public.template_items DROP CONSTRAINT IF EXISTS template_items_template_id_fkey;

-- Drop the template_items table if it exists
DROP TABLE IF EXISTS public.template_items CASCADE;

-- Drop the template_item_type enum if it exists
DROP TYPE IF EXISTS public.template_item_type;

-- Create the template_item_type enum
CREATE TYPE public.template_item_type AS ENUM (
    'divider',
    'multiple_choice',
    'photo',
    'section',
    'single_choice',
    'text'
);

-- Create the template_items table with the 'type' column correctly defined
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
    type public.template_item_type NOT NULL -- Correctly defined 'type' column
);

-- Add primary key constraint
ALTER TABLE public.template_items ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);

-- Add foreign key constraints
ALTER TABLE public.template_items ADD CONSTRAINT template_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.template_items(id) ON DELETE CASCADE;
ALTER TABLE public.template_items ADD CONSTRAINT template_items_report_recipient_id_fkey FOREIGN KEY (report_recipient_id) REFERENCES public.report_service_teams(id) ON DELETE SET NULL;
ALTER TABLE public.template_items ADD CONSTRAINT template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;

-- Add check constraint
ALTER TABLE public.template_items ADD CONSTRAINT check_no_self_reference CHECK ((id <> parent_id));

-- Add indexes
CREATE INDEX idx_template_items_hierarchy ON public.template_items USING btree (template_id, parent_id, "order");
CREATE INDEX idx_template_items_order ON public.template_items USING btree ("order");
CREATE INDEX idx_template_items_order_fallback ON public.template_items USING btree ("order") WHERE (parent_id IS NULL);
CREATE INDEX idx_template_items_order_scoped ON public.template_items USING btree (template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX idx_template_items_parent_id ON public.template_items USING btree (parent_id);
CREATE INDEX idx_template_items_report_recipient_id ON public.template_items USING btree (report_recipient_id);
CREATE INDEX idx_template_items_template_id ON public.template_items USING btree (template_id);
CREATE INDEX idx_template_items_type ON public.template_items USING btree (type);

-- Add trigger for updated_at
CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON public.template_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure (optional, for your confirmation)
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'template_items' AND column_name = 'type';
```