```diff
--- a/supabase/migrations/20250723090515_lingering_cloud.sql
+++ b/supabase/migrations/20250723090515_lingering_cloud.sql
@@ -1,5 +1,5 @@
 -- CreateEnum
-CREATE TYPE "public"."inspection_type" AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
+CREATE TYPE "public"."inspection_type" IF NOT EXISTS AS ENUM ('check_in', 'check_out', 'move_in', 'move_out');
 
 -- CreateEnum
 CREATE TYPE "public"."stripe_order_status" AS ENUM ('pending', 'completed', 'canceled');

```