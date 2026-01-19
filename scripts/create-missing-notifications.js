/**
 * Create notifications for today's paid orders retroactively
 * This fixes the issue where orders were paid via Xendit but notifications weren't created
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const sb = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inline notification creation logic
async function createNotification(order) {
  const isRental = order.order_type === 'rental';
  const typeLabel = isRental ? 'RENTAL' : 'PURCHASE';
  
  // Get product name
  let productName = 'Akun Game Premium';
  if (order.products && order.products.name) {
    productName = order.products.name;
  } else if (isRental) {
    productName = 'Akun Game Rental';
  }
  
  // Map type - Use paid_order for now since database constraint doesn't allow paid_rent yet
  // TODO: Apply migration to add new_rent and paid_rent types to database constraint
  const finalType = 'paid_order'; // isRental ? 'paid_rent' : 'paid_order';
  
  const titles = {
    paid_order: isRental 
      ? 'Bang! ALHAMDULILLAH RENTAL udah di bayar nih'
      : 'Bang! ALHAMDULILLAH PURCHASE udah di bayar nih',
  };
  
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const messages = {
    paid_order: isRental
      ? `namanya ${order.customer_name}, produknya ${productName} harganya ${formatAmount(order.amount)}, RENTAL udah di bayar Alhamdulillah.`
      : `namanya ${order.customer_name}, produknya ${productName} harganya ${formatAmount(order.amount)}, PURCHASE udah di bayar Alhamdulillah.`,
  };
  
  const notification = {
    type: finalType,
    title: titles[finalType],
    message: messages[finalType],
    order_id: order.id,
    customer_name: order.customer_name,
    product_name: productName,
    amount: Math.round(Number(order.amount)),
    is_read: false,
    metadata: {
      priority: 'high',
      category: 'payment',
      order_type: order.order_type,
      customer_phone: order.customer_phone,
    },
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await sb
    .from('admin_notifications')
    .insert(notification)
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    return null;
  }
  
  return data;
}

async function createMissingNotifications() {
  console.log('\n🔧 Creating missing notifications for today\'s paid orders\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get today's paid orders
  const { data: orders, error: ordersError } = await sb
    .from('orders')
    .select(`
      id,
      customer_name,
      customer_email,
      customer_phone,
      amount,
      status,
      order_type,
      product_id,
      products:product_id (id, name)
    `)
    .in('status', ['paid', 'completed'])
    .gte('updated_at', today.toISOString())
    .order('updated_at', { ascending: false });
  
  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError);
    return;
  }
  
  if (!orders || orders.length === 0) {
    console.log('✅ No paid orders found today');
    return;
  }
  
  console.log(`Found ${orders.length} paid orders today\n`);
  
  // Get existing notifications for today
  const { data: existingNotifs } = await sb
    .from('admin_notifications')
    .select('order_id')
    .gte('created_at', today.toISOString());
  
  const existingOrderIds = new Set((existingNotifs || []).map(n => n.order_id));
  
  // Filter orders that don't have notifications
  const ordersNeedingNotifs = orders.filter(o => !existingOrderIds.has(o.id));
  
  console.log(`${ordersNeedingNotifs.length} orders need notifications\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const order of ordersNeedingNotifs) {
    try {
      console.log(`Creating notification for: ${order.customer_name} - ${order.order_type} - Rp ${order.amount.toLocaleString('id-ID')}`);
      
      const result = await createNotification(order);
      
      if (result) {
        console.log(`✅ Notification created successfully (ID: ${result.id})\n`);
        successCount++;
      } else {
        console.log(`❌ Failed to create notification\n`);
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Error creating notification:`, error.message);
      failCount++;
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total orders: ${orders.length}`);
}

createMissingNotifications().catch(console.error);
