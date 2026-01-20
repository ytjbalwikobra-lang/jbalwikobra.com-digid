import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Payment Reminder Cron Job
 * Send WhatsApp reminders for pending payments
 * 
 * Setup in Vercel:
 * 1. Go to Project Settings → Cron Jobs
 * 2. Add schedule: 0 9,15 * * * (9 AM and 3 PM daily)
 * 3. Path: /api/cron/payment-reminder
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find pending orders older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select(`
        id,
        external_id,
        customer_name,
        customer_email,
        customer_mobile_number,
        total_amount,
        payment_method,
        created_at,
        payments (
          id,
          status,
          payment_url,
          expires_at
        )
      `)
      .eq('status', 'pending')
      .gte('created_at', twentyFourHoursAgo)
      .lte('created_at', oneHourAgo);

    if (error) {
      throw error;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending orders to remind',
        count: 0
      });
    }

    const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();
    
    // Get contact phone for customer support
    const contactPhone = await wa.getContactPhone();

    const results: Array<{
      order_id: string;
      external_id: string;
      phone: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const order of pendingOrders) {
      // Skip if no mobile number
      if (!order.customer_mobile_number) {
        continue;
      }

      // Get payment info
      const payment = order.payments?.[0];
      if (!payment || !payment.payment_url) {
        continue;
      }

      // Check if payment expired
      if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
        continue;
      }

      // Calculate hours since order creation
      const hoursAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60));

      // Get product info if available
      let productName = 'Produk Digital';
      let orderType = 'purchase';
      let rentalDuration = '';
      
      try {
        const { data: orderDetail } = await supabase
          .from('orders')
          .select(`
            order_type,
            rental_duration,
            product_id,
            products:product_id (
              name
            )
          `)
          .eq('id', order.id)
          .single();
        
        if (orderDetail) {
          // Handle both array and single object response from Supabase
          const product = Array.isArray(orderDetail.products) 
            ? orderDetail.products[0] 
            : orderDetail.products;
          productName = product?.name || productName;
          orderType = orderDetail.order_type || 'purchase';
          rentalDuration = orderDetail.rental_duration || '';
        }
      } catch (err) {
      }
      
      const isRental = orderType === 'rental';
      const expiryHours = payment.expires_at ? Math.max(0, Math.floor((new Date(payment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))) : 24;
      
      const message = isRental
        ? `⏰ *REMINDER PEMBAYARAN RENTAL!* 🔔

Halo Bosku *${order.customer_name}*! 👋

Jangan lupa ya Bosku, pesanan rental masih menunggu pembayaran nih!

━━━━━━━━━━━━━━━━━━━━━━━
📋 *DETAIL PESANAN RENTAL*
━━━━━━━━━━━━━━━━━━━━━━━

🎮 Produk: *${productName}*
⏱️ Durasi: *${rentalDuration || 'Sesuai paket'}*
💰 Total: *Rp ${order.total_amount.toLocaleString('id-ID')}*
🆔 Order ID: *${order.external_id}*
📅 Dibuat: *${hoursAgo} jam yang lalu*

━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *SEGERA BAYAR YA BOSKU!*
━━━━━━━━━━━━━━━━━━━━━━━

⏰ *Sisa Waktu: ${expiryHours} jam lagi*

Kalau nggak dibayar dalam ${expiryHours} jam, order otomatis dibatalkan sistem ya Bosku. Sayang kan udah order tapi hangus?

━━━━━━━━━━━━━━━━━━━━━━━
💳 *BAYAR SEKARANG:*
━━━━━━━━━━━━━━━━━━━━━━━

Klik link ini ya Bosku:
${payment.payment_url}

Bisa bayar pakai:
✅ QRIS (paling cepat)
✅ Virtual Account
✅ E-Wallet
✅ Retail store

━━━━━━━━━━━━━━━━━━━━━━━
📞 *SETELAH BAYAR:*
━━━━━━━━━━━━━━━━━━━━━━━

• Tim kami langsung hubungi Bosku
• Video call verification (wajib)
• Akun rental langsung dikirim
• Siapkan KTP/SIM ya Bosku

━━━━━━━━━━━━━━━━━━━━━━━

*Kalau udah bayar, abaikan pesan ini ya!*

Ada masalah? Chat aja:
💬 wa.me/${contactPhone}
🌐 jbalwikobra.com

Buruan bayar ya Bosku, jangan sampai hangus! ⚡`
        : `⏰ *REMINDER PEMBAYARAN!* 🔔

Halo Bosku *${order.customer_name}*! 👋

Jangan lupa ya Bosku, pesanan masih menunggu pembayaran nih!

━━━━━━━━━━━━━━━━━━━━━━━
📋 *DETAIL PESANAN PURCHASE*
━━━━━━━━━━━━━━━━━━━━━━━

🎮 Produk: *${productName}*
💰 Total: *Rp ${order.total_amount.toLocaleString('id-ID')}*
🆔 Order ID: *${order.external_id}*
📅 Dibuat: *${hoursAgo} jam yang lalu*

━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *SEGERA BAYAR YA BOSKU!*
━━━━━━━━━━━━━━━━━━━━━━━

⏰ *Sisa Waktu: ${expiryHours} jam lagi*

Kalau nggak dibayar dalam ${expiryHours} jam, order otomatis dibatalkan sistem ya Bosku. Sayang kan udah order tapi hangus?

━━━━━━━━━━━━━━━━━━━━━━━
💳 *BAYAR SEKARANG:*
━━━━━━━━━━━━━━━━━━━━━━━

Klik link ini ya Bosku:
${payment.payment_url}

Bisa bayar pakai:
✅ QRIS (paling cepat)
✅ Virtual Account
✅ E-Wallet
✅ Retail store

━━━━━━━━━━━━━━━━━━━━━━━
🎁 *SETELAH BAYAR - BOSKU DAPAT:*
━━━━━━━━━━━━━━━━━━━━━━━

✅ Login credentials lengkap
✅ Panduan ganti email & bind
✅ Tips keamanan akun
✅ Warranty 30 hari
✅ Support after-sales

✨ *Full Ownership:*
Akun 100% milik Bosku! Bebas ganti email, password, dll.

━━━━━━━━━━━━━━━━━━━━━━━

*Kalau udah bayar, abaikan pesan ini ya!*

Ada masalah? Chat aja:
💬 wa.me/${contactPhone}
🌐 jbalwikobra.com

Buruan bayar ya Bosku, jangan sampai hangus! ⚡`;

      try {
        const result = await wa.sendMessage({
          phone: order.customer_mobile_number,
          message,
          contextType: 'payment-reminder',
          contextId: `order:${order.id}:reminder`
        });

        results.push({
          order_id: order.id,
          external_id: order.external_id,
          phone: order.customer_mobile_number,
          success: result.success,
          error: result.error
        });

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err: any) {
        console.error(`[Payment Reminder] Error sending to ${order.external_id}:`, err);
        results.push({
          order_id: order.id,
          external_id: order.external_id,
          phone: order.customer_mobile_number,
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: true,
      message: 'Payment reminders sent',
      total_orders: pendingOrders.length,
      reminders_sent: results.length,
      success_count: successCount,
      fail_count: failCount,
      results
    });

  } catch (error: any) {
    console.error('[Payment Reminder] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
