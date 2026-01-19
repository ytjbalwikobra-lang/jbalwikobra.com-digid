// Test notification creation directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNotificationCreation() {
  console.log('\n🧪 TESTING NOTIFICATION CREATION\n');
  
  // Try creating a new_order notification
  console.log('1️⃣ Testing new_order type...');
  const { data: newOrder, error: newOrderError } = await supabase
    .from('admin_notifications')
    .insert({
      type: 'new_order',
      title: 'Test New Order',
      message: 'Test message for new order',
      customer_name: 'Test Customer',
      product_name: 'Test Product',
      amount: 100000,
      is_read: false
    })
    .select()
    .single();
  
  if (newOrderError) {
    console.error('❌ new_order creation failed:', newOrderError);
  } else {
    console.log('✅ new_order created:', newOrder.id);
  }
  
  // Try creating a new_rent notification
  console.log('\n2️⃣ Testing new_rent type...');
  const { data: newRent, error: newRentError } = await supabase
    .from('admin_notifications')
    .insert({
      type: 'new_rent',
      title: 'Test New Rent',
      message: 'Test message for new rent',
      customer_name: 'Test Customer',
      product_name: 'Test Product',
      amount: 50000,
      is_read: false
    })
    .select()
    .single();
  
  if (newRentError) {
    console.error('❌ new_rent creation failed:', newRentError);
  } else {
    console.log('✅ new_rent created:', newRent.id);
  }
  
  // Check if they were actually inserted
  console.log('\n3️⃣ Verifying in database...');
  const { data: all, error: allError } = await supabase
    .from('admin_notifications')
    .select('*')
    .in('type', ['new_order', 'new_rent'])
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (allError) {
    console.error('❌ Query failed:', allError);
  } else {
    console.log(`Found ${all?.length || 0} new_order/new_rent notifications:`);
    all?.forEach(n => {
      console.log(`  - ${n.type} | ${n.customer_name} | Created: ${new Date(n.created_at).toLocaleString()}`);
    });
  }
  
  // Clean up test notifications
  if (newOrder?.id) {
    await supabase.from('admin_notifications').delete().eq('id', newOrder.id);
    console.log('\n🧹 Cleaned up new_order test notification');
  }
  if (newRent?.id) {
    await supabase.from('admin_notifications').delete().eq('id', newRent.id);
    console.log('🧹 Cleaned up new_rent test notification');
  }
}

testNotificationCreation().catch(console.error);
