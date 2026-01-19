// Update existing notification messages to include RENTAL/PURCHASE distinction
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const formatAmount = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

async function updateNotificationsWithOrderType() {
  console.log('\n🔄 UPDATING NOTIFICATIONS WITH RENTAL/PURCHASE LABELS\n');
  
  // Get all order-related notifications
  const { data: notifications, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .in('type', ['new_order', 'paid_order', 'new_rent', 'paid_rent', 'order_cancelled'])
    .order('created_at', { ascending: false })
    .limit(200);
  
  if (error) {
    console.error('❌ Error fetching notifications:', error);
    return;
  }
  
  console.log(`📊 Found ${notifications.length} order notifications to update`);
  
  let updated = 0;
  
  for (const notif of notifications) {
    const rentalDuration = notif.metadata?.rental_duration || 'N/A';
    const isRental = notif.type === 'paid_rent' || notif.type === 'new_rent';
    
    let newMessage = '';
    
    // Update messages with RENTAL/PURCHASE labels
    if (notif.type === 'new_order') {
      newMessage = `[PURCHASE]\nNama: ${notif.customer_name}\nProduk: ${notif.product_name}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'paid_order') {
      newMessage = `[PURCHASE PAID]\nNama: ${notif.customer_name}\nProduk: ${notif.product_name}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'new_rent') {
      newMessage = `[RENTAL]\nNama: ${notif.customer_name}\nProduk: ${notif.product_name}\nDurasi: ${rentalDuration}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'paid_rent') {
      newMessage = `[RENTAL PAID]\nNama: ${notif.customer_name}\nProduk: ${notif.product_name}\nDurasi: ${rentalDuration}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'order_cancelled') {
      const orderTypeLabel = isRental ? 'RENTAL' : 'PURCHASE';
      newMessage = `[${orderTypeLabel} CANCELLED]\nNama: ${notif.customer_name}\nProduk: ${notif.product_name}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    }
    
    // Only update if message is different
    if (newMessage !== notif.message) {
      const { error: updateError } = await supabase
        .from('admin_notifications')
        .update({ message: newMessage })
        .eq('id', notif.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${notif.id}:`, updateError);
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`✅ Updated ${updated} notifications...`);
        }
      }
    }
  }
  
  console.log(`\n✅ Successfully updated ${updated} notifications with RENTAL/PURCHASE labels!\n`);
}

updateNotificationsWithOrderType().catch(console.error);
