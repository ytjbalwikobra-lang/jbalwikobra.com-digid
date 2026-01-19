/**
 * Test Notification Flow
 * Verify that paid order notifications are being created and retrieved correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { 
  auth: { autoRefreshToken: false, persistSession: false } 
});

async function testNotificationFlow() {
  console.log('\n🔍 Testing Notification Flow\n');
  
  // 1. Get all admin notifications (no filter)
  console.log('1️⃣ Fetching all admin notifications from database...');
  const { data: allNotifs, error: allError } = await sb
    .from('admin_notifications')
    .select('id, type, title, message, created_at, is_read, metadata')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (allError) {
    console.error('❌ Error fetching all notifications:', allError);
  } else {
    console.log(`✅ Found ${allNotifs.length} total notifications`);
    console.log('\nRecent notifications:');
    allNotifs.forEach((n, i) => {
      const isDebug = n.metadata?.test === true || n.metadata?.debug_mode === true || 
                      n.title?.toLowerCase().includes('[debug]') || 
                      n.title?.toLowerCase().includes('test');
      console.log(`  ${i + 1}. [${n.type}] ${n.title}`);
      console.log(`     Created: ${new Date(n.created_at).toLocaleString('id-ID')}`);
      console.log(`     Read: ${n.is_read ? 'Yes' : 'No'}, Debug: ${isDebug ? 'Yes' : 'No'}`);
    });
  }
  
  // 2. Get paid order notifications only
  console.log('\n2️⃣ Fetching paid order notifications (paid_order, paid_rent)...');
  const { data: paidNotifs, error: paidError } = await sb
    .from('admin_notifications')
    .select('id, type, title, message, amount, customer_name, product_name, created_at, is_read')
    .in('type', ['paid_order', 'paid_rent'])
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (paidError) {
    console.error('❌ Error fetching paid notifications:', paidError);
  } else {
    console.log(`✅ Found ${paidNotifs.length} paid notifications`);
    paidNotifs.forEach((n, i) => {
      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(n.amount || 0);
      console.log(`  ${i + 1}. [${n.type}] ${n.customer_name || 'Unknown'} - ${n.product_name || 'Unknown'}`);
      console.log(`     Amount: ${amount}, Created: ${new Date(n.created_at).toLocaleString('id-ID')}`);
    });
  }
  
  // 3. Test the API filter logic (mimicking admin-notifications.ts)
  console.log('\n3️⃣ Testing API filter logic (removes debug/test)...');
  const filtered = (allNotifs || []).filter((n) => {
    const title = (n.title || '').toString().toLowerCase();
    const message = (n.message || '').toString().toLowerCase();
    const md = n.metadata || {};
    const isDebug = md.test === true || md.debug_mode === true || md.auto_read === true || 
                    title.includes('[debug]') || title.includes('test') || message.includes('[debug mode]');
    return !isDebug;
  });
  console.log(`✅ After filtering: ${filtered.length} notifications (${allNotifs.length - filtered.length} filtered out)`);
  
  // 4. Check today's notifications
  console.log('\n4️⃣ Checking today\'s notifications...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayNotifs, error: todayError } = await sb
    .from('admin_notifications')
    .select('id, type, title, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  
  if (todayError) {
    console.error('❌ Error fetching today\'s notifications:', todayError);
  } else {
    console.log(`✅ Found ${todayNotifs.length} notifications created today`);
    const paidToday = todayNotifs.filter(n => n.type === 'paid_order' || n.type === 'paid_rent');
    console.log(`   - ${paidToday.length} paid notifications today`);
  }
  
  // 5. Check orders table for today's paid orders
  console.log('\n5️⃣ Checking today\'s paid orders in orders table...');
  const { data: paidOrders, error: ordersError } = await sb
    .from('orders')
    .select('id, customer_name, order_type, amount, status, created_at, updated_at')
    .in('status', ['paid', 'completed'])
    .gte('updated_at', today.toISOString())
    .order('updated_at', { ascending: false });
  
  if (ordersError) {
    console.error('❌ Error fetching paid orders:', ordersError);
  } else {
    console.log(`✅ Found ${paidOrders.length} paid orders today`);
    paidOrders.forEach((o, i) => {
      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(o.amount || 0);
      console.log(`  ${i + 1}. ${o.customer_name} - ${o.order_type} - ${amount}`);
      console.log(`     Status: ${o.status}, Updated: ${new Date(o.updated_at).toLocaleString('id-ID')}`);
      
      // Check if there's a corresponding notification
      const hasNotif = paidNotifs.some(n => 
        n.customer_name === o.customer_name && 
        Math.abs(n.amount - o.amount) < 100 // within 100 IDR
      );
      console.log(`     Has notification: ${hasNotif ? '✅ Yes' : '❌ No'}`);
    });
  }
  
  console.log('\n✨ Test completed!\n');
}

testNotificationFlow().catch(console.error);
