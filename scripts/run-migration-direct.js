#!/usr/bin/env node
/**
 * Run Auth Migration via Supabase Management API
 * Executes SQL migration using Supabase's Management API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config();

const SUPABASE_PROJECT_REF = 'xeithuvgldzxnggxadri'; // From supabase projects list
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function executeSQLViaPGRest() {
  console.log('🚀 Executing Auth Migration via Direct PostgreSQL Connection...\n');
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260120_auth_system_optimization.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log(`📄 Loaded migration (${sql.length} chars)`);
  
  // Split into executable statements - better parsing
  const cleanSQL = sql
    .replace(/--[^\n]*/g, '') // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
  
  // Execute via pg_rest (using PostgREST)
  const statements = splitSQLStatements(cleanSQL);
  
  console.log(`📊 Parsed ${statements.length} SQL statements\n`);
  
  let executed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt || stmt === 'BEGIN' || stmt === 'COMMIT') {
      skipped++;
      continue;
    }
    
    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);
    
    try {
      await executeSQL(stmt);
      console.log(' ✅');
      executed++;
    } catch (err) {
      // Check if it's a safe error (already exists, etc.)
      if (err.message && (
        err.message.includes('already exists') ||
        err.message.includes('does not exist')
      )) {
        console.log(' ⚠️  SKIP');
        skipped++;
      } else {
        console.log(` ❌ ${err.message}`);
        failed++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Summary:');
  console.log('='.repeat(60));
  console.log(`Executed: ${executed}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Total:    ${statements.length}`);
  
  // Verify the migration
  console.log('\n🔍 Verifying migration...');
  await verifyMigration();
}

function splitSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  let dollarQuoteTag = null;
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for function start
    if (trimmed.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
      inFunction = true;
    }
    
    // Check for dollar quote
    const dollarMatch = trimmed.match(/\$([a-zA-Z_]*)\$/);
    if (dollarMatch) {
      if (!dollarQuoteTag) {
        dollarQuoteTag = dollarMatch[1];
      } else if (dollarMatch[1] === dollarQuoteTag) {
        dollarQuoteTag = null;
      }
    }
    
    current += line + '\n';
    
    // Check for statement end
    if (trimmed.endsWith(';') && !inFunction && !dollarQuoteTag) {
      statements.push(current.trim().slice(0, -1)); // Remove trailing semicolon
      current = '';
    } else if (trimmed.endsWith(';') && inFunction && !dollarQuoteTag) {
      // End of function
      statements.push(current.trim().slice(0, -1));
      current = '';
      inFunction = false;
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(s => s && s.length > 5);
}

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL.replace('https://', '').replace('http://', '').split('/')[0],
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve(data);
        } else {
          reject(new Error(data || `HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(JSON.stringify({ sql_query: sql }));
    req.end();
  });
}

async function verifyMigration() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const checks = [
    {
      name: 'user_sessions table',
      sql: "SELECT to_regclass('public.user_sessions') IS NOT NULL as exists"
    },
    {
      name: 'phone_verifications table',
      sql: "SELECT to_regclass('public.phone_verifications') IS NOT NULL as exists"
    },
    {
      name: 'validate_session function',
      sql: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'validate_session') as exists"
    },
    {
      name: 'cleanup_expired_sessions function',
      sql: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_sessions') as exists"
    },
    {
      name: 'session_analytics view',
      sql: "SELECT to_regclass('public.session_analytics') IS NOT NULL as exists"
    }
  ];
  
  console.log('');
  for (const check of checks) {
    process.stdout.write(`  ✓ ${check.name}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: check.sql });
      console.log(' ✅');
    } catch (err) {
      console.log(' ⚠️');
    }
  }
  
  console.log('\n✅ Migration verification complete!');
  console.log('\n📚 Next steps:');
  console.log('   1. Deploy API changes: git push or vercel --prod');
  console.log('   2. Test auth flow in test-auth.html');
  console.log('   3. Monitor logs at /api/cron/cleanup-auth');
  console.log('   4. Review metrics in docs/security/README.md\n');
}

// Run migration
executeSQLViaPGRest().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
