@@ .. @@
 -- Create Primary Keys
-DO $$ BEGIN
-ALTER TABLE ONLY public.template_categories ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_categories_pkey' AND table_name = 'template_categories') THEN
+        ALTER TABLE ONLY public.template_categories ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'templates_pkey' AND table_name = 'templates') THEN
+        ALTER TABLE ONLY public.templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_service_teams_pkey' AND table_name = 'report_service_teams') THEN
+        ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.property_checklists ADD CONSTRAINT property_checklists_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklists_pkey' AND table_name = 'property_checklists') THEN
+        ALTER TABLE ONLY public.property_checklists ADD CONSTRAINT property_checklists_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'property_checklist_templates_pkey' AND table_name = 'property_checklist_templates') THEN
+        ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT property_checklist_templates_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'template_items_pkey' AND table_name = 'template_items') THEN
+        ALTER TABLE ONLY public.template_items ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_orders ADD CONSTRAINT stripe_orders_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_orders_pkey' AND table_name = 'stripe_orders') THEN
+        ALTER TABLE ONLY public.stripe_orders ADD CONSTRAINT stripe_orders_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_pkey' AND table_name = 'stripe_customers') THEN
+        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_subscriptions_pkey' AND table_name = 'stripe_subscriptions') THEN
+        ALTER TABLE ONLY public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_pkey' AND table_name = 'admin') THEN
+        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_pkey' AND table_name = 'properties') THEN
+        ALTER TABLE ONLY public.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_pkey' AND table_name = 'team_members') THEN
+        ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_pkey' AND table_name = 'profiles') THEN
+        ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.inspections ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspections_pkey' AND table_name = 'inspections') THEN
+        ALTER TABLE ONLY public.inspections ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.inspection_items ADD CONSTRAINT inspection_items_pkey PRIMARY KEY (id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inspection_items_pkey' AND table_name = 'inspection_items') THEN
+        ALTER TABLE ONLY public.inspection_items ADD CONSTRAINT inspection_items_pkey PRIMARY KEY (id);
+    END IF;
+END $$;

 -- Create Unique Constraints
-DO $$ BEGIN
-ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_admin_id_designation_key UNIQUE (admin_id, designation);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'report_service_teams_admin_id_designation_key' AND table_name = 'report_service_teams') THEN
+        ALTER TABLE ONLY public.report_service_teams ADD CONSTRAINT report_service_teams_admin_id_designation_key UNIQUE (admin_id, designation);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT unique_checklist_template UNIQUE (property_checklist_id, template_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_checklist_template' AND table_name = 'property_checklist_templates') THEN
+        ALTER TABLE ONLY public.property_checklist_templates ADD CONSTRAINT unique_checklist_template UNIQUE (property_checklist_id, template_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_orders ADD CONSTRAINT stripe_orders_checkout_session_id_key UNIQUE (checkout_session_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_orders_checkout_session_id_key' AND table_name = 'stripe_orders') THEN
+        ALTER TABLE ONLY public.stripe_orders ADD CONSTRAINT stripe_orders_checkout_session_id_key UNIQUE (checkout_session_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_customer_id_key UNIQUE (customer_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_customer_id_key' AND table_name = 'stripe_customers') THEN
+        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_customer_id_key UNIQUE (customer_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_user_id_key UNIQUE (user_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_customers_user_id_key' AND table_name = 'stripe_customers') THEN
+        ALTER TABLE ONLY public.stripe_customers ADD CONSTRAINT stripe_customers_user_id_key UNIQUE (user_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stripe_subscriptions_customer_id_key' AND table_name = 'stripe_subscriptions') THEN
+        ALTER TABLE ONLY public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_customer_id_key UNIQUE (customer_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_customer_id_key' AND table_name = 'admin') THEN
+        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_customer_id_key UNIQUE (customer_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_owner_id_key UNIQUE (owner_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_owner_id_key' AND table_name = 'admin') THEN
+        ALTER TABLE ONLY public.admin ADD CONSTRAINT admin_owner_id_key UNIQUE (owner_id);
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_admin_id_profile_id_key UNIQUE (admin_id, profile_id);
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'team_members_admin_id_profile_id_key' AND table_name = 'team_members') THEN
+        ALTER TABLE ONLY public.team_members ADD CONSTRAINT team_members_admin_id_profile_id_key UNIQUE (admin_id, profile_id);
+    END IF;
+END $$;

 -- Create Indexes
@@ .. @@
 -- Create Check Constraints
-DO $$ BEGIN
-ALTER TABLE public.template_items ADD CONSTRAINT check_no_self_reference CHECK ((id <> parent_id));
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_no_self_reference' AND table_name = 'template_items') THEN
+        ALTER TABLE public.template_items ADD CONSTRAINT check_no_self_reference CHECK ((id <> parent_id));
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE public.properties ADD CONSTRAINT properties_bathrooms_check CHECK ((bathrooms = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text, '5'::text, '6+'::text])));
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_bathrooms_check' AND table_name = 'properties') THEN
+        ALTER TABLE public.properties ADD CONSTRAINT properties_bathrooms_check CHECK ((bathrooms = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text, '5'::text, '6+'::text])));
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE public.properties ADD CONSTRAINT properties_bedrooms_check CHECK ((bedrooms = ANY (ARRAY['studio'::text, '1'::text, '2'::text, '3'::text, '4'::text, '5+'::text])));
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_bedrooms_check' AND table_name = 'properties') THEN
+        ALTER TABLE public.properties ADD CONSTRAINT properties_bedrooms_check CHECK ((bedrooms = ANY (ARRAY['studio'::text, '1'::text, '2'::text, '3'::text, '4'::text, '5+'::text])));
+    END IF;
+END $$;

-DO $$ BEGIN
-ALTER TABLE public.properties ADD CONSTRAINT properties_type_check CHECK ((type = ANY (ARRAY['apartment'::text, 'house'::text, 'villa'::text, 'condo'::text])));
-EXCEPTION WHEN duplicate_object THEN null;
-END $$;
+DO $$ BEGIN
+    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_type_check' AND table_name = 'properties') THEN
+        ALTER TABLE public.properties ADD CONSTRAINT properties_type_check CHECK ((type = ANY (ARRAY['apartment'::text, 'house'::text, 'villa'::text, 'condo'::text])));
+    END IF;
+END $$;