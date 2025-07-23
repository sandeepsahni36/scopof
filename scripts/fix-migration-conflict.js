#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMigrationConflict() {
  console.log('🔧 Fixing migration conflict for 20250723090515_lingering_cloud.sql\n');
  
  try {
    // Step 1: Check current state
    console.log('1. Checking current migration state...');
    const { data: currentMigrations, error: checkError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .eq('version', '20250723090515');

    if (checkError) {
      console.error('❌ Error checking migration state:', checkError.message);
      return false;
    }

    if (currentMigrations && currentMigrations.length > 0) {
      console.log('✅ Migration 20250723090515 is already marked as applied');
      console.log('   The conflict may be resolved. Try running your application.');
      return true;
    }

    // Step 2: Mark migration as applied
    console.log('2. Marking migration as applied...');
    const { error: insertError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
        VALUES (
          '20250723090515',
          NULL,
          '20250723090515_lingering_cloud.sql'
        );`
      });

    if (insertError) {
      console.error('❌ Failed to mark migration as applied:', insertError.message);
      
      // Try simpler approach
      console.log('   Trying alternative approach...');
      const { error: simpleInsertError } = await supabase
        .rpc('exec_sql', { 
          sql_query: `INSERT INTO supabase_migrations.schema_migrations (version)
          VALUES ('20250723090515');`
        });

      if (simpleInsertError) {
        console.error('❌ Alternative approach also failed:', simpleInsertError.message);
        return false;
      }
    }

    console.log('✅ Migration marked as applied successfully');

    // Step 3: Verify the fix
    console.log('3. Verifying the fix...');
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
      console.log('✅ Fix verified successfully');
      console.log('\n🎉 Migration conflict resolved!');
      console.log('\nNext steps:');
      console.log('1. Restart your application');
      console.log('2. Test authentication and core functionality');
      console.log('3. Monitor logs for any remaining issues');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Unexpected error during fix:', error.message);
    return false;
  }
}

// Run the fix
fixMigrationConflict().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});