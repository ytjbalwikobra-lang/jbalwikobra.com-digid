// Check notifications in database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNotifications() {
  console.log('\n📊 CHECKING TODAY\'S NOTIFICATIONS\n');
  
  // Get today's start and end
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayEnd = tomorrow.toISOString();
  
  // Get all today's orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', todayStart)
    .lt('created_at', todayEnd)
    .order('created_at', { ascending: false });
  
  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError);
    return;
  }
  
  console.log(`📦 TODAY'S ORDERS: ${orders?.length || 0}`);
  orders?.forEach(order => {
    console.log(`  - ${order.id.slice(0, 8)}... | ${order.order_type} | ${order.status} | ${order.customer_name} | ${order.amount}`);
  });
  
  // Get all today's notifications
  const { data: notifications, error: notifError } = await supabase
    .from('admin_notifications')
    .select('*')
    .gte('created_at', todayStart)
    .lt('created_at', todayEnd)
    .order('created_at', { ascending: false });
  
  if (notifError) {
    console.error('❌ Error fetching notifications:', notifError);
    return;
  }
  
  console.log(`\n🔔 TODAY'S NOTIFICATIONS: ${notifications?.length || 0}`);
  notifications?.forEach(notif => {
    console.log(`  - ${notif.type.padEnd(15)} | ${notif.customer_name} | ${notif.product_name} | ${notif.amount}`);
  });
  
  // Get ALL recent notifications (last 50)
  const { data: allNotifs, error: allError } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (allError) {
    console.error('❌ Error fetching all notifications:', allError);
    return;
  }
  
  console.log(`\n🔔 ALL RECENT NOTIFICATIONS (last 50): ${allNotifs?.length || 0}`);
  
  // Group by type
  const byType = {};
  allNotifs?.forEach(notif => {
    byType[notif.type] = (byType[notif.type] || 0) + 1;
  });
  
  console.log('\nBy type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Check if any new_order or new_rent exist
  const newOrders = allNotifs?.filter(n => n.type === 'new_order' || n.type === 'new_rent');
  console.log(`\n📋 NEW ORDER/RENT NOTIFICATIONS: ${newOrders?.length || 0}`);
  if (newOrders && newOrders.length > 0) {
    newOrders.slice(0, 5).forEach(n => {
      console.log(`  - ${n.type} | ${n.customer_name} | Created: ${new Date(n.created_at).toLocaleString()}`);
    });
  }
}

checkNotifications().catch(console.error);
