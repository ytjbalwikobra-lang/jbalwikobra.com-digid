#!/usr/bin/env node
/**
 * Execute migration SQL on Supabase using direct query execution
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
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Execute raw SQL using Supabase RPC
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    throw error;
  }
  
  return data;
}

async function syncHasRental() {
  console.log('🔄 Syncing has_rental field with rental_options table...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/2026-01-22_sync_has_rental_field.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Loaded migration file');
    
    // Execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);
    
    console.log(`📊 Executing ${statements.length} SQL statements\n`);
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);
      
      try {
        // Execute via Supabase client directly
        const { error } = await supabase.rpc('exec', { sql: stmt });
        
        if (error) {
          if (error.message && error.message.includes('already exists')) {
            console.log(' ⚠️  Already exists');
          } else {
            console.log(` ❌ ${error.message}`);
          }
        } else {
          console.log(' ✅');
        }
      } catch (err) {
        console.log(` ❌ ${err.message}`);
      }
    }
    
    console.log('\n✅ Migration process completed!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

syncHasRental();
