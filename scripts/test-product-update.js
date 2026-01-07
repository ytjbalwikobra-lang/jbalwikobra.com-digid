#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testUpdate() {
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
  const ANON_KEY = envVars.SUPABASE_ANON_KEY || envVars.REACT_APP_SUPABASE_ANON_KEY;
  const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🧪 Testing product update with different authentication methods...\n');

  // Test 1: With service role (should always work)
  console.log('Test 1: Update with SERVICE ROLE key (bypasses RLS)');
  const supabaseService = createClient(SUPABASE_URL, SERVICE_KEY);
  
  const { data: product } = await supabaseService
    .from('products')
    .select('id, price')
    .limit(1)
    .single();
  
  if (product) {
    console.log('   Product ID:', product.id);
    console.log('   Current price:', product.price);
    
    const testPrice = product.price + 1;
    const { data: updated, error } = await supabaseService
      .from('products')
      .update({ price: testPrice })
      .eq('id', product.id)
      .select()
      .maybeSingle();
    
    if (error) {
      console.log('   ❌ Update failed:', error.message);
    } else {
      console.log('   ✅ Update successful with service role');
      console.log('   New price:', updated.price);
      
      // Revert
      await supabaseService
        .from('products')
        .update({ price: product.price })
        .eq('id', product.id);
      console.log('   (Reverted to original price)');
    }
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');

  // Test 2: With anon key, no auth (should fail)
  console.log('Test 2: Update with ANON key, NO authentication (should fail)');
  const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
  
  if (product) {
    const { data: updated2, error: error2 } = await supabaseAnon
      .from('products')
      .update({ price: product.price + 1 })
      .eq('id', product.id)
      .select()
      .maybeSingle();
    
    if (error2) {
      console.log('   ❌ Update failed (expected):', error2.message);
      console.log('   Error code:', error2.code);
    } else {
      console.log('   ⚠️  Update succeeded (unexpected! RLS not working properly)');
    }
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');

  // Test 3: Check what happens with admin auth
  console.log('Test 3: Simulating logged-in admin user');
  console.log('   To test this properly, you need to:');
  console.log('   1. Log into your admin panel with admin@jbalwikobra.com');
  console.log('   2. Then try editing a price');
  console.log('');
  console.log('   The frontend will use the session token automatically');
  console.log('');
  
  // Check RLS policies
  console.log('📋 Checking RLS Policies on products table...\n');
  const { data: policies } = await supabaseService
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'products');
  
  if (policies && policies.length > 0) {
    policies.forEach(p => {
      console.log(`   Policy: ${p.policyname}`);
      console.log(`   Type: ${p.cmd}`);
      console.log(`   Using: ${p.qual || 'N/A'}`);
      console.log(`   With Check: ${p.with_check || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️  Could not fetch policies (might need special permissions)');
  }
  
  console.log('-'.repeat(80) + '\n');
  
  console.log('💡 DIAGNOSIS:');
  console.log('');
  console.log('The 406 error you\'re seeing is likely because:');
  console.log('');
  console.log('1. You\'re not logged in as admin when testing');
  console.log('   → Solution: Make sure you\'re logged in with admin@jbalwikobra.com');
  console.log('');
  console.log('2. The Accept header might be incorrect');
  console.log('   → This should be handled by Supabase client automatically');
  console.log('');
  console.log('3. The .single() call was expecting exactly 1 row');
  console.log('   → Already fixed with .maybeSingle()');
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Make sure you rebuild/restart your frontend: npm run build');
  console.log('   2. Clear browser cache and cookies');
  console.log('   3. Log in as admin@jbalwikobra.com');
  console.log('   4. Try editing a price');
  console.log('');
  console.log('If still not working, check browser console for auth token:');
  console.log('   localStorage.getItem(\'sb-xeithuvgldzxnggxadri-auth-token\')');
}

testUpdate().catch(console.error);
