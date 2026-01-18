#!/usr/bin/env node
/**
 * Check Supabase is_admin function and users table
 * Run: node scripts/check-supabase-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.production');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"\r\n]+)"?/);
  if (match) {
    envVars[match[1]] = match[2].replace(/\\r\\n$/, '').replace(/\r\n$/, '').trim();
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL || envVars.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = envVars.SUPABASE_ANON_KEY || envVars.REACT_APP_SUPABASE_ANON_KEY;

console.log('🔍 Checking Supabase Configuration...\n');
console.log('URL:', SUPABASE_URL);
console.log('Service Key:', SERVICE_KEY ? `${SERVICE_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('Anon Key:', ANON_KEY ? `${ANON_KEY.substring(0, 20)}...` : 'NOT FOUND');
console.log('\n' + '='.repeat(80) + '\n');

// Create client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkDatabase() {
  try {
    // 1. Check if users table exists
    console.log('📊 1. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, is_admin, auth_user_id, created_at')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log(`✅ Users table exists (${users.length} records found)`);
      console.log('Sample users:');
      users.forEach(u => {
        console.log(`  - ${u.email}: is_admin=${u.is_admin}, auth_user_id=${u.auth_user_id ? 'SET' : 'NULL'}`);
      });
    }
    console.log('\n' + '-'.repeat(80) + '\n');

    // 2. Check admin users
    console.log('👑 2. Checking admin users...');
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('*')
      .eq('is_admin', true);
    
    if (adminsError) {
      console.log('❌ Admin users query error:', adminsError.message);
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):`);
      admins.forEach(admin => {
        console.log(`  - ${admin.email}`);
        console.log(`    ID: ${admin.id}`);
        console.log(`    Auth User ID: ${admin.auth_user_id || 'NULL ⚠️'}`);
        console.log(`    Created: ${admin.created_at}`);
      });
    }
    console.log('\n' + '-'.repeat(80) + '\n');

    // 3. Check is_admin function
    console.log('🔧 3. Checking is_admin function...');
    const { data: funcCheck, error: funcError } = await supabase
      .rpc('is_admin', { uid: admins[0]?.auth_user_id || admins[0]?.id })
      .single();
    
    if (funcError) {
      console.log('❌ is_admin function error:', funcError.message);
      console.log('   This might mean the function doesn\'t exist or has wrong parameters');
    } else {
      console.log('✅ is_admin function exists');
      console.log(`   Result for ${admins[0]?.email}: ${funcCheck}`);
    }
    console.log('\n' + '-'.repeat(80) + '\n');

    // 4. Check products table and RLS
    console.log('📦 4. Checking products table...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, stock, is_active')
      .limit(3);
    
    if (productsError) {
      console.log('❌ Products table error:', productsError.message);
    } else {
      console.log(`✅ Products table accessible (${products.length} products found)`);
      console.log('Sample products:');
      products.forEach(p => {
        console.log(`  - ${p.name}: Rp ${p.price}, stock=${p.stock}, active=${p.is_active}`);
      });
    }
    console.log('\n' + '-'.repeat(80) + '\n');

    // 5. Test update permission with ANON key (simulates frontend)
    console.log('🧪 5. Testing product update with ANON key (simulates frontend)...');
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    
    if (products && products[0]) {
      const testProduct = products[0];
      const newPrice = testProduct.price + 1;
      
      console.log(`   Attempting to update product: ${testProduct.name}`);
      console.log(`   Current price: ${testProduct.price}, New price: ${newPrice}`);
      
      const { data: updateResult, error: updateError } = await anonClient
        .from('products')
        .update({ price: newPrice })
        .eq('id', testProduct.id)
        .select()
        .single();
      
      if (updateError) {
        console.log('❌ UPDATE FAILED with anon key:', updateError.message);
        console.log('   Error code:', updateError.code);
        console.log('   This is the PROBLEM! RLS is blocking the update.');
      } else {
        console.log('✅ UPDATE SUCCESSFUL with anon key');
        console.log('   New price:', updateResult.price);
        
        // Revert the change
        await supabase
          .from('products')
          .update({ price: testProduct.price })
          .eq('id', testProduct.id);
        console.log('   (Reverted back to original price)');
      }
    }
    console.log('\n' + '-'.repeat(80) + '\n');

    // 6. Get function definition
    console.log('📜 6. Getting is_admin function definition...');
    const { data: funcDef, error: funcDefError } = await supabase
      .rpc('exec_sql', { 
        query: `SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'is_admin'` 
      });
    
    if (funcDefError) {
      console.log('⚠️  Could not get function definition (exec_sql RPC not available)');
      console.log('   You can check manually in Supabase Dashboard → SQL Editor');
    } else {
      console.log('✅ Function definition:');
      console.log(funcDef);
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // Summary
    console.log('📋 SUMMARY:');
    console.log('');
    if (!admins || admins.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND!');
      console.log('   Fix: UPDATE public.users SET is_admin = true WHERE email = \'your-email@example.com\';');
    } else {
      console.log(`✅ ${admins.length} admin user(s) found`);
      
      const adminsMissingAuthId = admins.filter(a => !a.auth_user_id);
      if (adminsMissingAuthId.length > 0) {
        console.log(`⚠️  ${adminsMissingAuthId.length} admin(s) missing auth_user_id:`);
        adminsMissingAuthId.forEach(a => console.log(`   - ${a.email}`));
        console.log('   Fix: Run sync query in migration');
      }
    }
    
    console.log('');
    console.log('Next steps:');
    console.log('1. Run the migration: /supabase/migrations/20260107_fix_is_admin_function_for_users_table.sql');
    console.log('2. Verify admin users have auth_user_id set');
    console.log('3. Test price editing in admin panel');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
  }
}

checkDatabase();
