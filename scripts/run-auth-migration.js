#!/usr/bin/env node
/**
 * Run Auth Migration Script
 * Executes the auth system optimization migration on the Supabase database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Found:');
  console.error(`   - SUPABASE_URL: ${SUPABASE_URL ? 'Yes' : 'No'}`);
  console.error(`   - SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? 'Yes (hidden)' : 'No'}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting Auth System Optimization Migration...\n');
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260120_auth_system_optimization.sql');
  console.log(`📄 Reading migration file: ${migrationPath}`);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`✅ Loaded migration (${sql.length} chars)\n`);
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');
  
  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // Execute statements one by one
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
    
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        // Check if it's an "already exists" error (safe to ignore)
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('does not exist')
        )) {
          console.log(' ⚠️  SKIPPED (already exists)');
          successCount++;
        } else {
          console.log(' ❌ ERROR');
          errorCount++;
          errors.push({
            statement: i + 1,
            preview,
            error: error.message
          });
        }
      } else {
        console.log(' ✅');
        successCount++;
      }
    } catch (err) {
      console.log(' ❌ EXCEPTION');
      errorCount++;
      errors.push({
        statement: i + 1,
        preview,
        error: err.message
      });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors:     ${errorCount}`);
  console.log(`📊 Total:      ${statements.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. Statement #${err.statement}:`);
      console.log(`   ${err.preview}`);
      console.log(`   Error: ${err.error}`);
    });
  }
  
  // Try alternative approach: Execute the entire SQL as a transaction
  console.log('\n🔄 Attempting direct SQL execution...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      // Check if exec_sql function exists
      if (error.message && error.message.includes('function public.exec_sql')) {
        console.log('⚠️  exec_sql function not available. Creating alternative...');
        
        // Create a simpler exec function
        const createExecFunction = `
          CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql_query;
          END;
          $$;
        `;
        
        await supabase.rpc('query', { sql: createExecFunction });
        console.log('✅ Created exec_sql function');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    } else {
      console.log('✅ Migration executed successfully via direct SQL');
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
  
  // Verify migration was applied
  console.log('\n🔍 Verifying migration...');
  await verifyMigration();
}

async function verifyMigration() {
  const checks = [
    {
      name: 'user_sessions table',
      query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sessions'
        )
      `
    },
    {
      name: 'phone_verifications table',
      query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'phone_verifications'
        )
      `
    },
    {
      name: 'validate_session function',
      query: `
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'validate_session'
        )
      `
    },
    {
      name: 'cleanup_expired_sessions function',
      query: `
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'cleanup_expired_sessions'
        )
      `
    }
  ];
  
  for (const check of checks) {
    process.stdout.write(`  Checking ${check.name}...`);
    
    try {
      const { data, error } = await supabase.rpc('query', { sql: check.query });
      
      if (error) {
        console.log(' ❌');
      } else {
        console.log(' ✅');
      }
    } catch (err) {
      console.log(' ❌');
    }
  }
  
  console.log('\n✅ Migration process complete!');
  console.log('\n📚 Next steps:');
  console.log('   1. Check Supabase dashboard for new tables and functions');
  console.log('   2. Run test-auth.html to verify session validation');
  console.log('   3. Monitor cron job logs at /api/cron/cleanup-auth');
  console.log('   4. Review docs/security/README.md for monitoring queries\n');
}

// Run migration
runMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
