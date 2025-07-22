/*
  # Fix template_items table type column

  This migration ensures the template_items table has the correct structure
  with the type column properly defined.
*/

-- First, drop the table if it exists to recreate it properly
DROP TABLE IF EXISTS public.template_items CASCADE;

-- Recreate the template_items table with all columns including type
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

-- Add primary key
ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);

-- Add foreign key constraints
ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.template_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_report_recipient_id_fkey FOREIGN KEY (report_recipient_id) REFERENCES public.report_service_teams(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;

-- Add check constraint
ALTER TABLE ONLY public.template_items ADD CONSTRAINT check_no_self_reference CHECK ((id <> parent_id));

-- Create indexes
CREATE INDEX idx_template_items_hierarchy ON public.template_items USING btree (template_id, parent_id, "order");
CREATE INDEX idx_template_items_order ON public.template_items USING btree ("order");
CREATE INDEX idx_template_items_order_fallback ON public.template_items USING btree ("order") WHERE (parent_id IS NULL);
CREATE INDEX idx_template_items_order_scoped ON public.template_items USING btree (template_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), "order");
CREATE INDEX idx_template_items_parent_id ON public.template_items USING btree (parent_id);
CREATE INDEX idx_template_items_report_recipient_id ON public.template_items USING btree (report_recipient_id);
CREATE INDEX idx_template_items_template_id ON public.template_items USING btree (template_id);
CREATE INDEX idx_template_items_type ON public.template_items USING btree (type);

-- Enable RLS
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'template_items' 
        AND policyname = 'template_items_manage_admins'
    ) THEN
        CREATE POLICY template_items_manage_admins ON public.template_items
        FOR ALL
        TO authenticated
        USING ((EXISTS ( SELECT 1
           FROM (templates t
             JOIN admin a ON ((t.admin_id = a.id)))
          WHERE ((t.id = template_items.template_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1
                   FROM team_members tm
                  WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'template_items' 
        AND policyname = 'template_items_postgres_all'
    ) THEN
        CREATE POLICY template_items_postgres_all ON public.template_items
        FOR ALL
        TO postgres
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'template_items' 
        AND policyname = 'template_items_select_members'
    ) THEN
        CREATE POLICY template_items_select_members ON public.template_items
        FOR SELECT
        TO authenticated
        USING ((EXISTS ( SELECT 1
           FROM (templates t
             JOIN admin a ON ((t.admin_id = a.id)))
          WHERE ((t.id = template_items.template_id) AND (EXISTS ( SELECT 1
                   FROM team_members tm
                  WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
    END IF;
END $$;

-- Create trigger
CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON public.template_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();