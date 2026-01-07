const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/[\r\n]+/g, '');
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/[\r\n]+/g, '');

async function testAdminUpdate() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n=== Testing Admin Product Update ===\n');
  
  // Sign in as admin
  console.log('1. Signing in as admin@jbalwikobra.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@jbalwikobra.com',
    password: process.argv[2] || '' // Pass password as argument
  });
  
  if (authError) {
    console.error('❌ Auth error:', authError.message);
    return;
  }
  
  console.log('✅ Signed in successfully');
  console.log('User ID:', authData.user.id);
  
  // Check if user is admin
  console.log('\n2. Checking is_admin function...');
  const { data: adminCheck, error: adminError } = await supabase.rpc('is_admin', { uid: authData.user.id });
  
  if (adminError) {
    console.error('❌ is_admin error:', adminError);
  } else {
    console.log('✅ is_admin result:', adminCheck);
  }
  
  // Get a product to test with
  console.log('\n3. Getting first product...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price')
    .limit(1);
  
  if (productsError || !products?.length) {
    console.error('❌ Cannot get product:', productsError);
    return;
  }
  
  const product = products[0];
  console.log('✅ Found product:', product.name, 'Current price:', product.price);
  
  // Try to update the price
  console.log('\n4. Testing price update...');
  const newPrice = product.price + 1000;
  
  const { data: updateData, error: updateError } = await supabase
    .from('products')
    .update({ price: newPrice, updated_at: new Date().toISOString() })
    .eq('id', product.id)
    .select();
  
  if (updateError) {
    console.error('❌ Update error:', updateError);
    console.error('Details:', JSON.stringify(updateError, null, 2));
  } else {
    console.log('✅ Update successful!');
    console.log('Response:', updateData);
  }
  
  // Revert the change
  if (updateData) {
    console.log('\n5. Reverting price change...');
    await supabase
      .from('products')
      .update({ price: product.price, updated_at: new Date().toISOString() })
      .eq('id', product.id);
    console.log('✅ Reverted');
  }
}

testAdminUpdate().catch(console.error);
