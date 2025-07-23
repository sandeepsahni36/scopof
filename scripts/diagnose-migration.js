#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseMigrationState() {
  console.log('🔍 Diagnosing migration state...\n');
  
  try {
    // Check if schema_migrations table exists
    console.log('1. Checking migration tracking table...');
    const { data: migrationTable, error: tableError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Migration tracking table not accessible:', tableError.message);
      console.log('   This might indicate a fresh database or missing migration infrastructure.\n');
    } else {
      console.log('✅ Migration tracking table exists\n');
    }

    // Get all applied migrations
    console.log('2. Checking applied migrations...');
    const { data: appliedMigrations, error: migrationsError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .order('version', { ascending: false });

    if (migrationsError) {
      console.log('❌ Error fetching applied migrations:', migrationsError.message);
    } else {
      console.log('✅ Applied migrations:');
      if (appliedMigrations && appliedMigrations.length > 0) {
        appliedMigrations.forEach(migration => {
          console.log(`   - ${migration.version}`);
        });
      } else {
        console.log('   - No migrations found in tracking table');
      }
    }
    console.log('');

    // Check for specific problematic objects that might cause conflicts
    console.log('3. Checking for potentially conflicting database objects...');
    
    // Check for reports table (mentioned in lingering_cloud.sql)
    const { data: reportsTable, error: reportsError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'reports'
        ) as table_exists;`
      });
    
    if (!reportsError && reportsTable && reportsTable.length > 0) {
      console.log(`   - reports table exists: ${reportsTable[0].table_exists}`);
    }

    // Check for key enums
    const { data: enumCheck, error: enumError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `SELECT EXISTS (
          SELECT 1 FROM pg_type 
          WHERE typname = 'inspection_type'
        ) as enum_exists;`
      });
    
    if (!enumError && enumCheck && enumCheck.length > 0) {
      console.log(`   - inspection_type enum exists: ${enumCheck[0].enum_exists}`);
    }

    // Check for key functions
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
        ) as function_exists;`
      });
    
    if (!functionError && functionCheck && functionCheck.length > 0) {
      console.log(`   - handle_new_user function exists: ${functionCheck[0].function_exists}`);
    }

    console.log('\n4. Migration state summary:');
    
    // Check if 20250723090515 is in applied migrations
    const hasLingering = appliedMigrations?.some(m => m.version === '20250723090515');
    console.log(`   - 20250723090515_lingering_cloud.sql applied: ${hasLingering ? 'YES' : 'NO'}`);
    
    if (!hasLingering && reportsTable?.[0]?.table_exists) {
      console.log('   ⚠️  CONFLICT DETECTED: Objects exist but migration not tracked');
      console.log('   📋 RECOMMENDED ACTION: Mark migration as applied (safe approach)');
    } else if (hasLingering) {
      console.log('   ✅ Migration is properly tracked');
    } else {
      console.log('   ℹ️  Migration not applied - this is normal for a fresh state');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

async function fixMigrationConflict() {
  console.log('\n🔧 Attempting to fix migration conflict...\n');
  
  try {
    // Mark the problematic migration as applied
    console.log('Marking 20250723090515_lingering_cloud.sql as applied...');
    
    const { error: insertError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('20250723090515')
        ON CONFLICT (version) DO NOTHING;`
      });

    if (insertError) {
      console.error('❌ Failed to mark migration as applied:', insertError.message);
      return false;
    }

    console.log('✅ Migration marked as applied successfully');
    
    // Verify the fix
    const { data: verification, error: verifyError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .eq('version', '20250723090515')
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      return false;
    }

    if (verification) {
      console.log('✅ Fix verified - migration is now properly tracked');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Fix attempt failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Supabase Migration Diagnostic Tool\n');
  
  await diagnoseMigrationState();
  
  // Ask user if they want to attempt the fix
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nDo you want to attempt to fix the migration conflict? (y/N): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const success = await fixMigrationConflict();
      if (success) {
        console.log('\n🎉 Migration conflict resolved!');
        console.log('You can now try running your application again.');
      } else {
        console.log('\n❌ Fix attempt failed. Manual intervention may be required.');
      }
    } else {
      console.log('\nDiagnostic complete. No changes made.');
    }
    rl.close();
  });
}

main().catch(console.error);