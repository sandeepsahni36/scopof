#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuthFlow() {
  console.log('🔍 Debugging Auth Flow and Database State...\n');
  
  try {
    // Check recent users
    console.log('1. Checking recent users...');
    const { data: recentUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log('✅ Recent users:');
      recentUsers?.forEach(user => {
        console.log(`   - ${user.email} (${user.id}) - ${new Date(user.created_at).toLocaleString()}`);
      });
    }

    // Check admin records for recent users
    console.log('\n2. Checking admin records...');
    const { data: adminRecords, error: adminError } = await supabase
      .from('admin')
      .select('id, owner_id, company_name, customer_id, subscription_status, subscription_tier, trial_ends_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (adminError) {
      console.error('❌ Error fetching admin records:', adminError.message);
    } else {
      console.log('✅ Recent admin records:');
      adminRecords?.forEach(admin => {
        console.log(`   - ${admin.company_name} (${admin.id})`);
        console.log(`     Owner: ${admin.owner_id}`);
        console.log(`     Customer ID: ${admin.customer_id || 'NULL'}`);
        console.log(`     Status: ${admin.subscription_status}`);
        console.log(`     Tier: ${admin.subscription_tier}`);
        console.log(`     Trial Ends: ${admin.trial_ends_at}`);
        console.log('');
      });
    }

    // Check user_admin_status view
    console.log('3. Checking user_admin_status view...');
    const { data: userAdminStatus, error: statusError } = await supabase
      .from('user_admin_status')
      .select('*')
      .order('profile_id')
      .limit(5);
    
    if (statusError) {
      console.error('❌ Error fetching user admin status:', statusError.message);
    } else {
      console.log('✅ User admin status:');
      userAdminStatus?.forEach(status => {
        console.log(`   - Profile: ${status.profile_id}`);
        console.log(`     Admin: ${status.admin_id}`);
        console.log(`     Role: ${status.role}`);
        console.log(`     Is Owner: ${status.is_owner}`);
        console.log(`     Has Active Sub: ${status.has_active_subscription}`);
        console.log(`     Customer ID: ${status.customer_id || 'NULL'}`);
        console.log('');
      });
    }

    // Check RLS policies on key tables
    console.log('4. Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'admin', 'team_members')
          ORDER BY tablename, policyname;
        `
      });
    
    if (policiesError) {
      console.error('❌ Error fetching RLS policies:', policiesError.message);
    } else {
      console.log('✅ RLS Policies:');
      policies?.forEach(policy => {
        console.log(`   - ${policy.tablename}.${policy.policyname}`);
        console.log(`     Command: ${policy.cmd}`);
        console.log(`     Roles: ${policy.roles}`);
        console.log(`     Condition: ${policy.qual || 'none'}`);
        console.log('');
      });
    }

    // Test a specific user's access
    if (recentUsers && recentUsers.length > 0) {
      const testUser = recentUsers[0];
      console.log(`5. Testing access for user: ${testUser.email}`);
      
      // Test profile access
      const { data: profileTest, error: profileTestError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUser.id)
        .single();
      
      console.log(`   Profile access: ${profileTestError ? 'FAILED' : 'SUCCESS'}`);
      if (profileTestError) {
        console.log(`   Error: ${profileTestError.message}`);
      }

      // Test admin access
      const { data: adminTest, error: adminTestError } = await supabase
        .from('admin')
        .select('*')
        .eq('owner_id', testUser.id)
        .maybeSingle();
      
      console.log(`   Admin access: ${adminTestError ? 'FAILED' : 'SUCCESS'}`);
      if (adminTestError) {
        console.log(`   Error: ${adminTestError.message}`);
      } else if (adminTest) {
        console.log(`   Admin record found: ${adminTest.company_name}`);
      } else {
        console.log(`   No admin record found for user`);
      }

      // Test user_admin_status view access
      const { data: statusTest, error: statusTestError } = await supabase
        .from('user_admin_status')
        .select('*')
        .eq('profile_id', testUser.id)
        .maybeSingle();
      
      console.log(`   User admin status access: ${statusTestError ? 'FAILED' : 'SUCCESS'}`);
      if (statusTestError) {
        console.log(`   Error: ${statusTestError.message}`);
      } else if (statusTest) {
        console.log(`   Status: has_active_subscription = ${statusTest.has_active_subscription}`);
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

debugAuthFlow().catch(console.error);