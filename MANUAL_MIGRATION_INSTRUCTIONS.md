# Manual Migration Instructions

## The Problem
The migration script is failing because the `exec_sql` RPC function doesn't exist in your Supabase instance. All 217 SQL statements are failing with the error: "Could not find the function public.exec_sql(sql_query) in the schema cache"

## The Solution
We need to run the migration SQL directly in the Supabase dashboard.

## Steps to Fix

### 1. Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `wqspdgmsqijucboobktd`
3. Navigate to **SQL Editor** in the left sidebar

### 2. Copy the Migration SQL
1. Open the file `supabase/migrations/20250723090515_lingering_cloud.sql` in your project
2. Copy the ENTIRE contents of this file (all ~35KB of SQL)

### 3. Execute the Migration
1. In the Supabase SQL Editor, paste the entire SQL content
2. Click the **Run** button (or press Ctrl/Cmd + Enter)
3. Wait for the execution to complete

### 4. Expected Results
- Some statements may show warnings about objects already existing - this is normal
- The important functions like `handle_new_user()` should be created successfully
- You should see a success message when it completes

### 5. Verify the Fix
After running the SQL, test your application:
1. Clear your browser cache and cookies
2. Try registering a new user
3. The `handle_new_user()` function error should be resolved

## Alternative: Use Supabase CLI (if available)
If you have Supabase CLI installed locally, you can also run:
```bash
supabase db push
```

But since you're in WebContainer, the manual dashboard approach is recommended.

## What This Migration Contains
This migration includes:
- Database tables (properties, templates, inspections, etc.)
- Authentication triggers and functions
- Row Level Security policies
- The missing `handle_new_user()` function
- All necessary database schema for your application

## After Migration Success
Once the migration is applied successfully:
1. Your user registration should work properly
2. The `handle_new_user()` function will create user profiles and admin records
3. Your application should function normally