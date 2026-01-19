// Update old notification messages to new simplified format
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

async function updateNotifications() {
  console.log('\n🔄 UPDATING NOTIFICATION MESSAGES TO NEW FORMAT\n');
  
  // Get all notifications
  const { data: notifications, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  
  if (error) {
    console.error('❌ Error fetching notifications:', error);
    return;
  }
  
  console.log(`📊 Found ${notifications.length} notifications to update`);
  
  let updated = 0;
  
  for (const notif of notifications) {
    const rentalDuration = notif.metadata?.rental_duration || 'N/A';
    const isRental = notif.type === 'paid_rent' || notif.type === 'new_rent';
    
    let newTitle = '';
    let newMessage = '';
    
    // Update titles
    if (notif.type === 'new_order') {
      newTitle = '🛒 Order Baru';
      newMessage = `Nama: ${notif.customer_name}\nProduk: ${notif.product_name}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'paid_order') {
      newTitle = '💰 Pembayaran Diterima';
      newMessage = `Nama: ${notif.customer_name}\nProduk: ${notif.product_name}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'new_rent') {
      newTitle = '🎮 Rental Baru';
      newMessage = `Nama: ${notif.customer_name}\nProduk: ${notif.product_name}\nDurasi: ${rentalDuration}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'paid_rent') {
      newTitle = '💰 Rental Dibayar';
      newMessage = `Nama: ${notif.customer_name}\nProduk: ${notif.product_name}\nDurasi: ${rentalDuration}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else if (notif.type === 'order_cancelled') {
      newTitle = '❌ Order Dibatalkan';
      newMessage = `Nama: ${notif.customer_name}\nProduk: ${notif.product_name}\nHarga: ${formatAmount(notif.amount)}\nTanggal: ${formatDate(notif.created_at)}`;
    } else {
      // Skip other types for now
      continue;
    }
    
    // Update the notification
    const { error: updateError } = await supabase
      .from('admin_notifications')
      .update({
        title: newTitle,
        message: newMessage
      })
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
  
  console.log(`\n✅ Successfully updated ${updated} notifications!\n`);
}

updateNotifications().catch(console.error);
