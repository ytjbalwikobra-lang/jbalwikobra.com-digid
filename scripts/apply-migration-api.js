#!/usr/bin/env node
/**
 * Apply Migration via Supabase Management API
 * Uses Supabase Management API to execute SQL directly
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config();

const PROJECT_REF = 'xeithuvgldzxnggxadri';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n[ERROR] Missing environment variables');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: SUPABASE_URL.replace(/^https?:\/\//, '').split('/')[0],
      port: 443,
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

async function applyMigration() {
  console.log('\n==================================================');
  console.log('  AUTH SYSTEM MIGRATION - Supabase API');
  console.log('==================================================\n');
  
  console.log('[1/3] Reading migration file...');
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260120_auth_system_optimization.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`[ERROR] Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`[OK] Loaded ${sql.length} characters\n`);
  
  console.log('[2/3] Executing migration via Supabase API...');
  console.log('[INFO] This will execute the entire SQL transaction...\n');
  
  try {
    const startTime = Date.now();
    await executeSQL(sql);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[OK] Migration executed in ${duration}s\n`);
  } catch (err) {
    console.error(`[ERROR] ${err.message}\n`);
    
    // Try alternative: Create helper function first, then execute
    console.log('[INFO] Trying alternative approach...');
    console.log('[INFO] Creating exec helper function...\n');
    
    const createHelper = `
      CREATE OR REPLACE FUNCTION exec(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;
    
    try {
      await executeSQL(createHelper);
      console.log('[OK] Helper function created\n');
      
      // Now try to execute migration
      console.log('[INFO] Executing migration with helper...\n');
      await executeSQL(`SELECT exec($$ ${sql.replace(/\$/g, '\\$')} $$)`);
      console.log('[OK] Migration executed\n');
    } catch (err2) {
      console.error(`[ERROR] ${err2.message}\n`);
      console.log('[INFO] API approach failed. Using manual SQL copy method...\n');
      
      // Copy SQL to clipboard
      const { exec } = require('child_process');
      const sqlForClipboard = sql;
      
      // On Windows, use clip.exe
      const child = exec('clip', (error) => {
        if (error) {
          console.error('[WARNING] Could not copy to clipboard automatically');
        } else {
          console.log('[OK] SQL copied to clipboard!\n');
        }
      });
      
      child.stdin.write(sqlForClipboard);
      child.stdin.end();
      
      console.log('==================================================');
      console.log('  MANUAL MIGRATION REQUIRED');
      console.log('==================================================\n');
      console.log('The SQL has been copied to your clipboard.');
      console.log('');
      console.log('Please:');
      console.log('  1. Open: https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new');
      console.log('  2. Paste (CTRL+V) and click RUN');
      console.log('  3. Run: node scripts/verify-migration.js\n');
      
      process.exit(1);
    }
  }
  
  console.log('[3/3] Migration complete!\n');
  console.log('Next: Run verification script');
  console.log('  node scripts/verify-migration.js\n');
}

applyMigration().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
