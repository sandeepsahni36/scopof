@@ .. @@
 -- Create enum types
-CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
-CREATE TYPE stripe_order_status AS ENUM ('canceled', 'completed', 'pending');
-CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
-CREATE TYPE team_member_role AS ENUM ('admin', 'member', 'owner');
-CREATE TYPE template_item_type AS ENUM ('divider', 'multiple_choice', 'photo', 'section', 'single_choice', 'text');
-CREATE TYPE inspection_status AS ENUM ('canceled', 'completed', 'in_progress');
+-- Create enum types with existence checks
+DO $$
+BEGIN
+    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_type') THEN
+        CREATE TYPE inspection_type AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
+    END IF;
+END $$;
+
+DO $$
+BEGIN
+    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_order_status') THEN
+        CREATE TYPE stripe_order_status AS ENUM ('canceled', 'completed', 'pending');
+    END IF;
+END $$;
+
+DO $$
+BEGIN
+    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
+        CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
+    END IF;
+END $$;
+
+DO $$
+BEGIN
+    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
+        CREATE TYPE team_member_role AS ENUM ('admin', 'member', 'owner');
+    END IF;
+END $$;
+
+DO $$
+BEGIN
+    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_item_type') THEN
+        CREATE TYPE template_item_type AS ENUM ('divider', 'multiple_choice', 'photo', 'section', 'single_choice', 'text');
+    END IF;
+END $$;
+
+DO $$
+BEGIN
+    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
+        CREATE TYPE inspection_status AS ENUM ('canceled', 'completed', 'in_progress');
+    END IF;
+END $$;