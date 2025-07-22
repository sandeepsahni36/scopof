@@ .. @@
CREATE TABLE IF NOT EXISTS public.template_items (
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
-    report_recipient_id uuid
+    report_recipient_id uuid,
+    type template_item_type NOT NULL
);