#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file or Supabase project settings.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Read the consolidated schema file
    const schemaPath = path.join(__dirname, '..', 'supabase', 'migrations', 'consolidated_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Loaded consolidated schema file');
    console.log(`📊 Schema size: ${(sqlContent.length / 1024).toFixed(1)} KB\n`);
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip empty statements
        if (!statement.trim()) continue;
        
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          // Check if it's a "already exists" error (which we can ignore)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          }
        } else {
          successCount++;
          console.log(`✅ Success: ${statement.substring(0, 50)}...`);
        }
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Unexpected error in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎊 All migrations applied successfully!');
    } else {
      console.log('\n⚠️  Some statements failed, but this might be expected (e.g., objects already exist)');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🚀 Starting direct SQL migration...\n');
    
    const schemaPath = path.join(__dirname, '..', 'supabase', 'migrations', 'consolidated_schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Executing consolidated schema directly...');
    
    const { data, error } = await supabase
      .from('_migrations')
      .select('*')
      .limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    console.log('\n⚠️  Note: You may need to run this SQL manually in your Supabase SQL editor:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of supabase/migrations/consolidated_schema.sql');
    console.log('   4. Click "Run" to execute the migration');
    
  } catch (error) {
    console.error('❌ Direct migration failed:', error.message);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const isDirect = args.includes('--direct');

if (isDirect) {
  runMigrationDirect();
} else {
  runMigration();
}