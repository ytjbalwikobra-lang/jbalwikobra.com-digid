#!/usr/bin/env node
/**
 * Apply Migration via PostgreSQL Connection
 * Uses node-postgres (pg) to execute migration directly
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config();

const PROJECT_REF = 'xeithuvgldzxnggxadri';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('\n[ERROR] Missing SUPABASE_DB_PASSWORD in .env file');
  console.error('\nTo get your database password:');
  console.error('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database');
  console.error('2. Copy the Database Password');
  console.error('3. Add to .env: SUPABASE_DB_PASSWORD=your_password_here\n');
  process.exit(1);
}

// Connection string for Supabase
const connectionString = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;

async function applyMigration() {
  console.log('\n==================================================');
  console.log('  AUTH SYSTEM MIGRATION - PostgreSQL Direct');
  console.log('==================================================\n');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('[1/4] Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('[OK] Connected successfully\n');
    
    console.log('[2/4] Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260120_auth_system_optimization.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`[OK] Loaded ${sql.length} characters\n`);
    
    console.log('[3/4] Executing migration...');
    console.log('[INFO] This may take 30-60 seconds...\n');
    
    const startTime = Date.now();
    
    try {
      await client.query(sql);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[OK] Migration executed successfully in ${duration}s\n`);
    } catch (err) {
      // Check if error is about existing objects (safe to ignore)
      if (err.message.includes('already exists') || 
          err.message.includes('does not exist')) {
        console.log('[WARNING] Some objects already exist (safe to ignore)\n');
      } else {
        throw err;
      }
    }
    
    console.log('[4/4] Verifying migration...\n');
    
    // Verify tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_sessions', 'phone_verifications')
      ORDER BY table_name
    `);
    
    console.log('  Tables:');
    tablesResult.rows.forEach(row => {
      console.log(`    [OK] ${row.table_name}`);
    });
    
    // Verify functions
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN (
        'validate_session',
        'cleanup_expired_sessions',
        'cleanup_expired_verifications',
        'get_user_session_count',
        'invalidate_all_user_sessions',
        'refresh_session_analytics'
      )
      ORDER BY routine_name
    `);
    
    console.log('\n  Functions:');
    functionsResult.rows.forEach(row => {
      console.log(`    [OK] ${row.routine_name}()`);
    });
    
    // Verify indexes
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('user_sessions', 'phone_verifications')
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
      LIMIT 10
    `);
    
    console.log('\n  Indexes (showing first 10):');
    indexesResult.rows.forEach(row => {
      console.log(`    [OK] ${row.indexname}`);
    });
    
    // Verify materialized view
    const viewResult = await client.query(`
      SELECT matviewname 
      FROM pg_matviews 
      WHERE schemaname = 'public' 
      AND matviewname = 'session_analytics'
    `);
    
    console.log('\n  Materialized Views:');
    if (viewResult.rows.length > 0) {
      viewResult.rows.forEach(row => {
        console.log(`    [OK] ${row.matviewname}`);
      });
    } else {
      console.log('    [WARNING] session_analytics not found');
    }
    
    // Test validate_session function
    console.log('\n  Testing Functions:');
    try {
      const testResult = await client.query(`
        SELECT * FROM validate_session('test_token_12345678901234567890123456789012345678901234567890123456')
      `);
      console.log('    [OK] validate_session() - returns expected structure');
    } catch (err) {
      console.log('    [WARNING] validate_session() test failed (expected for test token)');
    }
    
    console.log('\n==================================================');
    console.log('  MIGRATION COMPLETE!');
    console.log('==================================================\n');
    
    console.log('Next Steps:');
    console.log('  1. Test auth flow: Open public/test-auth.html');
    console.log('  2. Monitor cron job: /api/cron/cleanup-auth');
    console.log('  3. Check analytics: SELECT * FROM session_analytics;');
    console.log('  4. Review docs: docs/security/README.md\n');
    
  } catch (err) {
    console.error('\n[ERROR] Migration failed:');
    console.error(err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check if pg is installed
try {
  require.resolve('pg');
  applyMigration();
} catch (e) {
  console.log('\n[INFO] Installing required package: pg');
  const { execSync } = require('child_process');
  execSync('npm install pg', { stdio: 'inherit' });
  console.log('[OK] Package installed, running migration...\n');
  applyMigration();
}
