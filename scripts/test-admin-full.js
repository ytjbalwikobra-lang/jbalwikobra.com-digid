const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/[\r\n]+/g, '');
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/[\r\n]+/g, '');

async function testAdminFull() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('\n=== Full Admin Test: Create & Edit Product ===\n');
  console.log('Supabase URL:', supabaseUrl);
  
  // Sign in as admin
  const email = 'admin@jbalwikobra.com';
  const password = process.argv[2];
  
  if (!password) {
    console.error('❌ Please provide password as argument');
    console.log('Usage: node scripts/test-admin-full.js "PASSWORD"');
    return;
  }
  
  console.log('1. Signing in as', email, '...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error('❌ Auth error:', authError.message);
    console.log('\nTrying to reset password via Supabase...');
    return;
  }
  
  console.log('✅ Signed in successfully');
  console.log('   User ID:', authData.user.id);
  console.log('   Email:', authData.user.email);
  
  // Check is_admin function
  console.log('\n2. Testing is_admin function...');
  const { data: isAdminResult, error: isAdminError } = await supabase.rpc('is_admin', { 
    uid: authData.user.id 
  });
  
  if (isAdminError) {
    console.error('❌ is_admin error:', isAdminError.message);
  } else {
    console.log('✅ is_admin result:', isAdminResult);
    if (!isAdminResult) {
      console.log('⚠️  User is not marked as admin!');
    }
  }
  
  // Create a test product
  console.log('\n3. Creating test product...');
  const testProduct = {
    name: 'Test Product ' + Date.now(),
    description: 'Test product for admin editing',
    price: 50000,
    stock: 10,
    category_id: null,
    tier_id: null,
    game_title_id: null,
    image: 'https://via.placeholder.com/300',
    images: ['https://via.placeholder.com/300'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data: createData, error: createError } = await supabase
    .from('products')
    .insert(testProduct)
    .select();
  
  if (createError) {
    console.error('❌ Create error:', createError.message);
    console.error('   Details:', JSON.stringify(createError, null, 2));
  } else {
    console.log('✅ Product created!');
    console.log('   ID:', createData[0].id);
    console.log('   Name:', createData[0].name);
    console.log('   Price:', createData[0].price);
    
    // Now try to edit it
    const productId = createData[0].id;
    const newPrice = 75000;
    
    console.log('\n4. Editing product price from', createData[0].price, 'to', newPrice, '...');
    const { data: updateData, error: updateError } = await supabase
      .from('products')
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select();
    
    if (updateError) {
      console.error('❌ Update error:', updateError.message);
      console.error('   Code:', updateError.code);
      console.error('   Details:', JSON.stringify(updateError, null, 2));
    } else {
      if (updateData && updateData.length > 0) {
        console.log('✅ Product updated!');
        console.log('   New price:', updateData[0].price);
      } else {
        console.log('⚠️  Update returned no data (but no error)');
        console.log('   Response:', updateData);
      }
    }
    
    // Clean up - delete the test product
    console.log('\n5. Cleaning up test product...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError.message);
      console.log('   Please manually delete product:', productId);
    } else {
      console.log('✅ Test product deleted');
    }
  }
  
  console.log('\n=== Test Complete ===\n');
}

testAdminFull().catch(console.error);
