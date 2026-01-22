#!/usr/bin/env node
/**
 * Execute raw SQL on Supabase using service role key
 * This bypasses RLS and executes SQL directly
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`);
    
    const postData = JSON.stringify({ sql });
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function syncHasRental() {
  console.log('🔄 Syncing has_rental field with rental_options table...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/2026-01-22_sync_has_rental_field.sql');
    let sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Remove comments
    sql = sql.replace(/--[^\n]*/g, '').trim();
    
    console.log('📄 Loaded migration file');
    console.log(`📊 Executing SQL (${sql.length} characters)\n`);
    
    const result = await executeSQL(sql);
    console.log('\n✅ Migration executed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

syncHasRental();
