@@ .. @@
   END IF;
   RETURN NEW;
 END;
+$$;
+
+-- Create reports table
+CREATE TABLE IF NOT EXISTS public.reports (
+    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
+    inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
+    report_url text NOT NULL,
+    report_type text NOT NULL,
+    generated_at timestamp with time zone NOT NULL,
+    created_at timestamp with time zone DEFAULT now(),
+    updated_at timestamp with time zone DEFAULT now()
+);
+
+-- Add indexes
+CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON public.reports USING btree (inspection_id);
+CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports USING btree (generated_at DESC);
+
+-- Add RLS policy
+ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
+
+CREATE POLICY "reports_access_for_members" ON public.reports
+  FOR ALL
+  TO authenticated
+  USING (EXISTS ( SELECT 1
+           FROM (((inspections i
+             JOIN properties p ON ((i.property_id = p.id)))
+             JOIN admin a ON ((p.admin_id = a.id)))
+             JOIN team_members tm ON ((tm.admin_id = a.id)))
+          WHERE ((i.id = reports.inspection_id) AND (tm.profile_id = uid()))));
+
+-- Add trigger for updated_at
+CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();