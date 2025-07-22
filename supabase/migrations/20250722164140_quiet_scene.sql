@@ .. @@
 -- Create Policies
 DO $$
 BEGIN
-    -- Profiles policies
-    CREATE POLICY IF NOT EXISTS "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK ((uid() = id));
-    CREATE POLICY IF NOT EXISTS "profiles_select_own" ON public.profiles FOR SELECT USING ((uid() = id));
-    CREATE POLICY IF NOT EXISTS "profiles_update_own" ON public.profiles FOR UPDATE USING ((uid() = id)) WITH CHECK ((uid() = id));
-    CREATE POLICY IF NOT EXISTS "profiles_postgres_all" ON public.profiles FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Profiles policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
+        CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK ((uid() = id));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
+        CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING ((uid() = id));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
+        CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING ((uid() = id)) WITH CHECK ((uid() = id));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_postgres_all') THEN
+        CREATE POLICY "profiles_postgres_all" ON public.profiles FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Admin policies
-    CREATE POLICY IF NOT EXISTS "admin_owner_full_access" ON public.admin FOR ALL USING ((owner_id = uid()));
-    CREATE POLICY IF NOT EXISTS "admin_postgres_access" ON public.admin FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Admin policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin' AND policyname = 'admin_owner_full_access') THEN
+        CREATE POLICY "admin_owner_full_access" ON public.admin FOR ALL USING ((owner_id = uid()));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin' AND policyname = 'admin_postgres_access') THEN
+        CREATE POLICY "admin_postgres_access" ON public.admin FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Properties policies
-    CREATE POLICY IF NOT EXISTS "properties_manage_admins" ON public.properties FOR ALL USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
-    CREATE POLICY IF NOT EXISTS "properties_select_members" ON public.properties FOR SELECT USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
-    CREATE POLICY IF NOT EXISTS "properties_postgres_all" ON public.properties FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Properties policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' AND policyname = 'properties_manage_admins') THEN
+        CREATE POLICY "properties_manage_admins" ON public.properties FOR ALL USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' AND policyname = 'properties_select_members') THEN
+        CREATE POLICY "properties_select_members" ON public.properties FOR SELECT USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = properties.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties' AND policyname = 'properties_postgres_all') THEN
+        CREATE POLICY "properties_postgres_all" ON public.properties FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Team members policies
-    CREATE POLICY IF NOT EXISTS "team_members_admin_manage" ON public.team_members FOR ALL USING ((admin_id IN ( SELECT admin.id FROM admin WHERE (admin.owner_id = uid()))));
-    CREATE POLICY IF NOT EXISTS "team_members_own_record" ON public.team_members FOR ALL USING ((profile_id = uid()));
-    CREATE POLICY IF NOT EXISTS "team_members_postgres_access" ON public.team_members FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Team members policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'team_members_admin_manage') THEN
+        CREATE POLICY "team_members_admin_manage" ON public.team_members FOR ALL USING ((admin_id IN ( SELECT admin.id FROM admin WHERE (admin.owner_id = uid()))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'team_members_own_record') THEN
+        CREATE POLICY "team_members_own_record" ON public.team_members FOR ALL USING ((profile_id = uid()));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'team_members_postgres_access') THEN
+        CREATE POLICY "team_members_postgres_access" ON public.team_members FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Template categories policies
-    CREATE POLICY IF NOT EXISTS "template_categories_manage_admins" ON public.template_categories FOR ALL USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
-    CREATE POLICY IF NOT EXISTS "template_categories_select_members" ON public.template_categories FOR SELECT USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
-    CREATE POLICY IF NOT EXISTS "template_categories_postgres_all" ON public.template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Template categories policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'template_categories' AND policyname = 'template_categories_manage_admins') THEN
+        CREATE POLICY "template_categories_manage_admins" ON public.template_categories FOR ALL USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'template_categories' AND policyname = 'template_categories_select_members') THEN
+        CREATE POLICY "template_categories_select_members" ON public.template_categories FOR SELECT USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = template_categories.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'template_categories' AND policyname = 'template_categories_postgres_all') THEN
+        CREATE POLICY "template_categories_postgres_all" ON public.template_categories FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Templates policies
-    CREATE POLICY IF NOT EXISTS "templates_manage_admins" ON public.templates FOR ALL USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = templates.id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
-    CREATE POLICY IF NOT EXISTS "templates_select_members" ON public.templates FOR SELECT USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = templates.id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
-    CREATE POLICY IF NOT EXISTS "templates_postgres_all" ON public.templates FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Templates policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_manage_admins') THEN
+        CREATE POLICY "templates_manage_admins" ON public.templates FOR ALL USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = templates.id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_select_members') THEN
+        CREATE POLICY "templates_select_members" ON public.templates FOR SELECT USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = templates.id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_postgres_all') THEN
+        CREATE POLICY "templates_postgres_all" ON public.templates FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Template items policies
-    CREATE POLICY IF NOT EXISTS "template_items_manage_admins" ON public.template_items FOR ALL USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
-    CREATE POLICY IF NOT EXISTS "template_items_select_members" ON public.template_items FOR SELECT USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
-    CREATE POLICY IF NOT EXISTS "template_items_postgres_all" ON public.template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Template items policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'template_items' AND policyname = 'template_items_manage_admins') THEN
+        CREATE POLICY "template_items_manage_admins" ON public.template_items FOR ALL USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'template_items' AND policyname = 'template_items_select_members') THEN
+        CREATE POLICY "template_items_select_members" ON public.template_items FOR SELECT USING ((EXISTS ( SELECT 1 FROM (templates t JOIN admin a ON ((t.admin_id = a.id))) WHERE ((t.id = template_items.template_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'template_items' AND policyname = 'template_items_postgres_all') THEN
+        CREATE POLICY "template_items_postgres_all" ON public.template_items FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Report service teams policies
-    CREATE POLICY IF NOT EXISTS "report_service_teams_manage_admins" ON public.report_service_teams FOR ALL USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
-    CREATE POLICY IF NOT EXISTS "report_service_teams_select_members" ON public.report_service_teams FOR SELECT USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
-    CREATE POLICY IF NOT EXISTS "report_service_teams_postgres_all" ON public.report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Report service teams policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'report_service_teams' AND policyname = 'report_service_teams_manage_admins') THEN
+        CREATE POLICY "report_service_teams_manage_admins" ON public.report_service_teams FOR ALL USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'report_service_teams' AND policyname = 'report_service_teams_select_members') THEN
+        CREATE POLICY "report_service_teams_select_members" ON public.report_service_teams FOR SELECT USING ((EXISTS ( SELECT 1 FROM admin a WHERE ((a.id = report_service_teams.admin_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'report_service_teams' AND policyname = 'report_service_teams_postgres_all') THEN
+        CREATE POLICY "report_service_teams_postgres_all" ON public.report_service_teams FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Property checklists policies
-    CREATE POLICY IF NOT EXISTS "property_checklists_manage_admins" ON public.property_checklists FOR ALL USING ((EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
-    CREATE POLICY IF NOT EXISTS "property_checklists_select_members" ON public.property_checklists FOR SELECT USING ((EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
-    CREATE POLICY IF NOT EXISTS "property_checklists_postgres_all" ON public.property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Property checklists policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'property_checklists' AND policyname = 'property_checklists_manage_admins') THEN
+        CREATE POLICY "property_checklists_manage_admins" ON public.property_checklists FOR ALL USING ((EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND ((a.owner_id = uid()) OR (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()) AND (tm.role = ANY (ARRAY['owner'::team_member_role, 'admin'::team_member_role]))))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'property_checklists' AND policyname = 'property_checklists_select_members') THEN
+        CREATE POLICY "property_checklists_select_members" ON public.property_checklists FOR SELECT USING ((EXISTS ( SELECT 1 FROM (properties p JOIN admin a ON ((p.admin_id = a.id))) WHERE ((p.id = property_checklists.property_id) AND (EXISTS ( SELECT 1 FROM team_members tm WHERE ((tm.admin_id = a.id) AND (tm.profile_id = uid()))))))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'property_checklists' AND policyname = 'property_checklists_postgres_all') THEN
+        CREATE POLICY "property_checklists_postgres_all" ON public.property_checklists FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Property checklist templates policies
-    CREATE POLICY IF NOT EXISTS "property_checklist_templates_access_for_members" ON public.property_checklist_templates FOR ALL USING ((EXISTS ( SELECT 1 FROM ((property_checklists pc JOIN properties p ON ((pc.property_id = p.id))) JOIN team_members tm ON ((tm.admin_id = p.admin_id))) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = uid())))));
-    CREATE POLICY IF NOT EXISTS "property_checklist_templates_postgres_all" ON public.property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Property checklist templates policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'property_checklist_templates' AND policyname = 'property_checklist_templates_access_for_members') THEN
+        CREATE POLICY "property_checklist_templates_access_for_members" ON public.property_checklist_templates FOR ALL USING ((EXISTS ( SELECT 1 FROM ((property_checklists pc JOIN properties p ON ((pc.property_id = p.id))) JOIN team_members tm ON ((tm.admin_id = p.admin_id))) WHERE ((pc.id = property_checklist_templates.property_checklist_id) AND (tm.profile_id = uid())))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'property_checklist_templates' AND policyname = 'property_checklist_templates_postgres_all') THEN
+        CREATE POLICY "property_checklist_templates_postgres_all" ON public.property_checklist_templates FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Inspections policies
-    CREATE POLICY IF NOT EXISTS "inspections_access_for_members" ON public.inspections FOR ALL USING ((EXISTS ( SELECT 1 FROM ((properties p JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND (tm.profile_id = uid())))));
-    CREATE POLICY IF NOT EXISTS "inspections_postgres_all" ON public.inspections FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Inspections policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspections' AND policyname = 'inspections_access_for_members') THEN
+        CREATE POLICY "inspections_access_for_members" ON public.inspections FOR ALL USING ((EXISTS ( SELECT 1 FROM ((properties p JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((p.id = inspections.property_id) AND (tm.profile_id = uid())))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspections' AND policyname = 'inspections_postgres_all') THEN
+        CREATE POLICY "inspections_postgres_all" ON public.inspections FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Inspection items policies
-    CREATE POLICY IF NOT EXISTS "inspection_items_access_for_members" ON public.inspection_items FOR ALL USING ((EXISTS ( SELECT 1 FROM (((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = uid())))));
-    CREATE POLICY IF NOT EXISTS "inspection_items_postgres_all" ON public.inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Inspection items policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspection_items' AND policyname = 'inspection_items_access_for_members') THEN
+        CREATE POLICY "inspection_items_access_for_members" ON public.inspection_items FOR ALL USING ((EXISTS ( SELECT 1 FROM (((inspections i JOIN properties p ON ((i.property_id = p.id))) JOIN admin a ON ((p.admin_id = a.id))) JOIN team_members tm ON ((tm.admin_id = a.id))) WHERE ((i.id = inspection_items.inspection_id) AND (tm.profile_id = uid())))));
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspection_items' AND policyname = 'inspection_items_postgres_all') THEN
+        CREATE POLICY "inspection_items_postgres_all" ON public.inspection_items FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
-    -- Stripe tables policies
-    CREATE POLICY IF NOT EXISTS "stripe_orders_postgres_all" ON public.stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);
-    CREATE POLICY IF NOT EXISTS "stripe_customers_postgres_all" ON public.stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
-    CREATE POLICY IF NOT EXISTS "stripe_subscriptions_postgres_all" ON public.stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
+    -- Stripe tables policies
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_orders' AND policyname = 'stripe_orders_postgres_all') THEN
+        CREATE POLICY "stripe_orders_postgres_all" ON public.stripe_orders FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_postgres_all') THEN
+        CREATE POLICY "stripe_customers_postgres_all" ON public.stripe_customers FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
+    
+    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_subscriptions' AND policyname = 'stripe_subscriptions_postgres_all') THEN
+        CREATE POLICY "stripe_subscriptions_postgres_all" ON public.stripe_subscriptions FOR ALL TO postgres USING (true) WITH CHECK (true);
+    END IF;
 
 EXCEPTION
     WHEN OTHERS THEN