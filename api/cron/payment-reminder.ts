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

    console.log('[Payment Reminder] Starting cron job...');

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

    console.log(`[Payment Reminder] Found ${pendingOrders?.length || 0} pending orders`);

    if (!pendingOrders || pendingOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending orders to remind',
        count: 0
      });
    }

    const { DynamicWhatsAppService } = await import('../_utils/dynamicWhatsAppService.js');
    const wa = new DynamicWhatsAppService();

    const results = [];

    for (const order of pendingOrders) {
      // Skip if no mobile number
      if (!order.customer_mobile_number) {
        console.log(`[Payment Reminder] Skipping order ${order.id} - no mobile number`);
        continue;
      }

      // Get payment info
      const payment = order.payments?.[0];
      if (!payment || !payment.payment_url) {
        console.log(`[Payment Reminder] Skipping order ${order.id} - no payment info`);
        continue;
      }

      // Check if payment expired
      if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
        console.log(`[Payment Reminder] Skipping order ${order.id} - payment expired`);
        continue;
      }

      // Calculate hours since order creation
      const hoursAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60));

      const message = `🔔 *PENGINGAT PEMBAYARAN*

Halo ${order.customer_name}! 

Kami ingin mengingatkan bahwa order Anda masih menunggu pembayaran:

📦 Order ID: ${order.external_id}
💰 Total: Rp ${order.total_amount.toLocaleString('id-ID')}
💳 Metode: ${order.payment_method}
⏰ Dibuat: ${hoursAgo} jam yang lalu

Silakan selesaikan pembayaran melalui link berikut:
${payment.payment_url}

Link pembayaran akan expired dalam ${payment.expires_at ? Math.max(0, Math.floor((new Date(payment.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))) : 24} jam.

Jika sudah melakukan pembayaran, mohon abaikan pesan ini.

Terima kasih! 🙏
*JB Alwikobra*`;

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

        console.log(`[Payment Reminder] Order ${order.external_id}: ${result.success ? 'SUCCESS' : 'FAILED'}`);

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

    console.log(`[Payment Reminder] Complete: ${successCount} success, ${failCount} failed`);

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
