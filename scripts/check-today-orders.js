const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const sb = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log('\n=== TODAY PAID ORDERS ===\n');
  
  const { data: orders, error: ordersError } = await sb
    .from('orders')
    .select('id, customer_name, order_type, amount, status, xendit_invoice_id, client_external_id, created_at, updated_at')
    .in('status', ['paid', 'completed'])
    .gte('updated_at', today.toISOString())
    .order('updated_at', { ascending: false });
  
  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    return;
  }
  
  (orders || []).forEach((o, i) => {
    console.log(`${i+1}. ${o.customer_name} - ${o.order_type} - Rp ${o.amount.toLocaleString('id-ID')}`);
    console.log(`   Status: ${o.status}`);
    console.log(`   Xendit Invoice: ${o.xendit_invoice_id || 'NONE - MANUAL UPDATE!'}`);
    console.log(`   External ID: ${o.client_external_id || 'NONE'}`);
    console.log(`   Created: ${new Date(o.created_at).toLocaleString('id-ID')}`);
    console.log(`   Updated: ${new Date(o.updated_at).toLocaleString('id-ID')}`);
    console.log('');
  });
  
  console.log('\n=== TODAY NOTIFICATIONS ===\n');
  
  const { data: notifs, error: notifsError } = await sb
    .from('admin_notifications')
    .select('id, type, title, customer_name, amount, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  
  if (notifsError) {
    console.error('Error fetching notifications:', notifsError);
    return;
  }
  
  console.log(`Found ${(notifs || []).length} notifications created today\n`);
  
  (notifs || []).forEach((n, i) => {
    console.log(`${i+1}. [${n.type}] ${n.customer_name} - Rp ${(n.amount || 0).toLocaleString('id-ID')}`);
    console.log(`   Title: ${n.title}`);
    console.log(`   Created: ${new Date(n.created_at).toLocaleString('id-ID')}`);
    console.log('');
  });
  
  console.log('\n=== ANALYSIS ===\n');
  
  const ordersArray = orders || [];
  const notifsArray = notifs || [];
  
  const ordersWithXendit = ordersArray.filter(o => o.xendit_invoice_id);
  const ordersManual = ordersArray.filter(o => !o.xendit_invoice_id);
  
  console.log(`✅ Orders paid via Xendit: ${ordersWithXendit.length}`);
  console.log(`✅ Orders paid manually: ${ordersManual.length}`);
  console.log(`❌ Total notifications: ${notifsArray.length}`);
  console.log(`❌ Missing notifications: ${ordersArray.length - notifsArray.length}`);
})();
