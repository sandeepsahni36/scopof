#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');

console.log('Environment Variables:');
console.log(`- VITE_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Set (length: ' + supabaseServiceKey.length + ')' : 'Missing'}`);
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

console.log('URL Details:');
console.log(`- Supabase URL: ${supabaseUrl}`);
console.log(`- URL format valid: ${supabaseUrl.includes('supabase.co') ? 'Yes' : 'No'}`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('Testing basic connection...');

try {
  // Test 1: Simple query
  console.log('Test 1: Basic query to auth.users...');
  const { data: users, error: usersError } = await supabase
    .from('auth.users')
    .select('id')
    .limit(1);
  
  if (usersError) {
    console.log(`❌ Auth users query failed: ${usersError.message}`);
  } else {
    console.log(`✅ Auth users query successful (found ${users?.length || 0} users)`);
  }
} catch (error) {
  console.log(`❌ Auth users query threw error: ${error.message}`);
}

try {
  // Test 2: Check if we can access public schema
  console.log('\nTest 2: Public schema access...');
  const { data: tables, error: tablesError } = await supabase
    .rpc('exec_sql', { sql_query: 'SELECT 1 as test;' });
  
  if (tablesError) {
    console.log(`❌ exec_sql RPC failed: ${tablesError.message}`);
    console.log('   This confirms exec_sql function is missing');
  } else {
    console.log(`✅ exec_sql RPC successful`);
  }
} catch (error) {
  console.log(`❌ exec_sql RPC threw error: ${error.message}`);
}

try {
  // Test 3: Direct table access
  console.log('\nTest 3: Direct table access...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  
  if (profilesError) {
    console.log(`❌ Profiles table access failed: ${profilesError.message}`);
  } else {
    console.log(`✅ Profiles table access successful (found ${profiles?.length || 0} profiles)`);
  }
} catch (error) {
  console.log(`❌ Profiles table access threw error: ${error.message}`);
}

try {
  // Test 4: Check for inspection_type enum
  console.log('\nTest 4: Check inspection_type enum...');
  const { data: enumCheck, error: enumError } = await supabase
    .from('pg_type')
    .select('typname')
    .eq('typname', 'inspection_type')
    .limit(1);
  
  if (enumError) {
    console.log(`❌ Enum check failed: ${enumError.message}`);
  } else {
    console.log(`✅ Enum check successful (inspection_type exists: ${enumCheck?.length > 0 ? 'Yes' : 'No'})`);
  }
} catch (error) {
  console.log(`❌ Enum check threw error: ${error.message}`);
}

console.log('\n🎯 Diagnosis Complete');
console.log('\nRecommendations:');
console.log('1. If exec_sql is missing: Run the migration manually in Supabase SQL Editor');
console.log('2. If connection fails: Check your environment variables and network');
console.log('3. If enum exists but migration fails: The migration tracking is out of sync');