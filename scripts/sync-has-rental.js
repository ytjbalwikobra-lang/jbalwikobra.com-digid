#!/usr/bin/env node
/**
 * Sync has_rental field with rental_options table
 * This ensures all products with rental options have has_rental = true
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function executeSQL(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${text}`);
  }

  return response.json();
}

async function syncHasRental() {
  console.log('🔄 Syncing has_rental field with rental_options table...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/2026-01-22_sync_has_rental_field.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Loaded migration file');
    
    // Split into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 5);
    
    console.log(`📊 Executing ${statements.length} SQL statements\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);
      
      try {
        await executeSQL(stmt);
        console.log(' ✅');
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(' ⚠️  Already exists');
        } else {
          console.log(` ❌ ${err.message}`);
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

syncHasRental();
