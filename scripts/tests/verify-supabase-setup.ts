/**
 * Supabase Configuration Verification Script
 * Run this to verify your Supabase setup before deploying fixes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'XENDIT_SECRET_KEY'
  ];
  
  const optionalVars = [
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY'
  ];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      results.push({
        name: varName,
        status: 'fail',
        message: 'Missing required environment variable'
      });
    } else if (value.includes('YOUR_') || value.includes('your_') || value.length < 10) {
      results.push({
        name: varName,
        status: 'fail',
        message: 'Environment variable appears to be a placeholder'
      });
    } else {
      results.push({
        name: varName,
        status: 'pass',
        message: 'Environment variable set correctly',
        details: `${value.substring(0, 20)}...`
      });
    }
  }
  
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value) {
      results.push({
        name: varName,
        status: 'warning',
        message: 'Optional environment variable not set'
      });
    } else {
      results.push({
        name: varName,
        status: 'pass',
        message: 'Optional environment variable set',
        details: `${value.substring(0, 20)}...`
      });
    }
  }
}

async function checkSupabaseConnection() {
  console.log('\n🔗 Checking Supabase Connection...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    results.push({
      name: 'Supabase Connection',
      status: 'fail',
      message: 'Cannot test connection - missing credentials'
    });
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Supabase Connection',
        status: 'fail',
        message: 'Connection failed',
        details: error.message
      });
    } else {
      results.push({
        name: 'Supabase Connection',
        status: 'pass',
        message: 'Successfully connected to Supabase'
      });
    }
  } catch (error) {
    results.push({
      name: 'Supabase Connection',
      status: 'fail',
      message: 'Connection error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function checkDatabaseTables() {
  console.log('\n📊 Checking Database Tables...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    results.push({
      name: 'Database Tables Check',
      status: 'fail',
      message: 'Cannot check tables - missing credentials'
    });
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const tables = [
    'users',
    'orders',
    'products',
    'admin_notifications',
    'flash_sales',
    'reviews'
  ];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') {
          results.push({
            name: `Table: ${table}`,
            status: 'fail',
            message: 'Table does not exist',
            details: 'Run migration to create this table'
          });
        } else {
          results.push({
            name: `Table: ${table}`,
            status: 'fail',
            message: 'Error querying table',
            details: error.message
          });
        }
      } else {
        results.push({
          name: `Table: ${table}`,
          status: 'pass',
          message: `Table exists with ${count || 0} records`
        });
      }
    } catch (error) {
      results.push({
        name: `Table: ${table}`,
        status: 'fail',
        message: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

async function checkRLSPolicies() {
  console.log('\n🔐 Checking RLS Policies...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    results.push({
      name: 'RLS Policies Check',
      status: 'fail',
      message: 'Cannot check policies - missing credentials'
    });
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check if service_role can access tables
    const tableChecks = [
      { name: 'users', policy: 'users_service_role_all' },
      { name: 'orders', policy: 'orders_service_role_all' },
      { name: 'admin_notifications', policy: 'admin_notifications_service_role_all' }
    ];
    
    for (const check of tableChecks) {
      try {
        const { data, error } = await supabase
          .from(check.name)
          .select('*')
          .limit(1);
        
        if (error) {
          results.push({
            name: `RLS Policy: ${check.policy}`,
            status: 'fail',
            message: 'Service role cannot access table',
            details: error.message
          });
        } else {
          results.push({
            name: `RLS Policy: ${check.policy}`,
            status: 'pass',
            message: 'Service role has proper access'
          });
        }
      } catch (error) {
        results.push({
          name: `RLS Policy: ${check.policy}`,
          status: 'fail',
          message: 'Error checking policy',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'RLS Policies Check',
      status: 'fail',
      message: 'Unexpected error checking policies',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function checkAPIEndpoints() {
  console.log('\n🌐 Checking API Endpoint Configuration...\n');
  
  const apiEndpoints = [
    '/api/admin?action=dashboard-stats',
    '/api/admin?action=orders',
    '/api/admin?action=users',
    '/api/xendit/create-invoice',
    '/api/xendit/webhook',
    '/api/admin-notifications?action=recent'
  ];
  
  results.push({
    name: 'API Endpoints',
    status: 'warning',
    message: 'API endpoints configured (test after deployment)',
    details: apiEndpoints.join(', ')
  });
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 VERIFICATION RESULTS');
  console.log('='.repeat(80) + '\n');
  
  const grouped = {
    pass: results.filter(r => r.status === 'pass'),
    warning: results.filter(r => r.status === 'warning'),
    fail: results.filter(r => r.status === 'fail')
  };
  
  console.log(`✅ Passed: ${grouped.pass.length}`);
  console.log(`⚠️  Warnings: ${grouped.warning.length}`);
  console.log(`❌ Failed: ${grouped.fail.length}\n`);
  
  if (grouped.fail.length > 0) {
    console.log('❌ FAILURES:\n');
    grouped.fail.forEach(r => {
      console.log(`  ${r.name}`);
      console.log(`    Message: ${r.message}`);
      if (r.details) console.log(`    Details: ${r.details}`);
      console.log('');
    });
  }
  
  if (grouped.warning.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    grouped.warning.forEach(r => {
      console.log(`  ${r.name}`);
      console.log(`    Message: ${r.message}`);
      if (r.details) console.log(`    Details: ${r.details}`);
      console.log('');
    });
  }
  
  if (grouped.pass.length > 0 && grouped.fail.length === 0) {
    console.log('✅ ALL CHECKS PASSED!\n');
  }
  
  console.log('='.repeat(80) + '\n');
  
  // Provide actionable recommendations
  if (grouped.fail.length > 0) {
    console.log('📝 RECOMMENDED ACTIONS:\n');
    
    const hasEnvVarIssues = grouped.fail.some(r => r.name.includes('_KEY') || r.name.includes('_URL'));
    const hasTableIssues = grouped.fail.some(r => r.name.startsWith('Table:'));
    const hasPolicyIssues = grouped.fail.some(r => r.name.startsWith('RLS Policy:'));
    
    if (hasEnvVarIssues) {
      console.log('1. Set missing environment variables in your .env file or Vercel dashboard');
      console.log('   - Get values from Supabase Project Settings > API');
      console.log('   - Get XENDIT_SECRET_KEY from Xendit Dashboard\n');
    }
    
    if (hasTableIssues) {
      console.log('2. Run database migration:');
      console.log('   - Open Supabase SQL Editor');
      console.log('   - Execute: supabase/migrations/20251229_comprehensive_fix_users_orders_analytics.sql\n');
    }
    
    if (hasPolicyIssues) {
      console.log('3. Fix RLS policies:');
      console.log('   - Run the migration script which includes RLS policy creation');
      console.log('   - Verify service_role key is correct\n');
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 SUPABASE CONFIGURATION VERIFICATION');
  console.log('='.repeat(80));
  
  await checkEnvironmentVariables();
  await checkSupabaseConnection();
  await checkDatabaseTables();
  await checkRLSPolicies();
  await checkAPIEndpoints();
  
  printResults();
}

// Run verification
main().catch(error => {
  console.error('\n❌ Verification script failed:', error);
  process.exit(1);
});
