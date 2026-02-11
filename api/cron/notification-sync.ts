/**
 * Cron Job: Sinkronisasi Notifikasi Pembayaran
 * 
 * Memeriksa order yang sudah dibayar (status paid/completed) tetapi tidak memiliki
 * notifikasi admin yang sesuai. Membuat notifikasi yang terlewat.
 * 
 * Kasus penggunaan:
 * - Webhook berhasil memperbarui status order, tapi gagal membuat notifikasi
 * - Race condition antara webhook dan notifikasi service
 * - Network timeout saat insert notifikasi
 * 
 * Jadwal: Setiap 10 menit (via vercel.json crons)
 * 
 * Endpoint: GET /api/cron/notification-sync
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createOrderNotification, getProductName, createCustomerPaymentNotification } from '../_utils/adminNotificationService.js';

function getSupabase() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n]/g, '');
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').replace(/[\r\n]/g, '');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validasi keamanan: hanya cron yang bisa memanggil
  const authHeader = req.headers.authorization;
  
  if (process.env.NODE_ENV === 'production' && !authHeader?.includes('Bearer')) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[NotifSync] Akses tidak sah');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const startTime = Date.now();
  const results = {
    orders_checked: 0,
    admin_notifications_created: 0,
    customer_notifications_created: 0,
    already_exists: 0,
    errors: [] as string[]
  };

  try {
    const supabase = getSupabase();

    // Cari order dengan status paid/completed dalam 48 jam terakhir
    // yang BELUM punya notifikasi admin tipe paid_order/paid_rent
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 48);

    const { data: paidOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, amount, status, order_type, rental_duration, product_id, user_id, paid_at, created_at')
      .in('status', ['paid', 'completed'])
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error('[NotifSync] Gagal query orders:', ordersError);
      return res.status(500).json({ success: false, error: ordersError.message });
    }

    if (!paidOrders || paidOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada order yang perlu dicek',
        ...results,
        duration_ms: Date.now() - startTime
      });
    }

    results.orders_checked = paidOrders.length;

    // Ambil semua notifikasi yang sudah ada untuk order-order ini
    const orderIds = paidOrders.map(o => o.id).filter(Boolean);
    
    const { data: existingNotifs, error: notifsError } = await supabase
      .from('admin_notifications')
      .select('order_id, type')
      .in('order_id', orderIds)
      .in('type', ['paid_order', 'paid_rent']);

    if (notifsError) {
      console.error('[NotifSync] Gagal query notifikasi:', notifsError);
      results.errors.push(`Query notif: ${notifsError.message}`);
    }

    // Buat set untuk pengecekan cepat: "orderId:type"
    const existingSet = new Set(
      (existingNotifs || []).map(n => `${n.order_id}:${n.type}`)
    );

    // Proses setiap order yang belum punya notifikasi
    for (const order of paidOrders) {
      const isRental = order.order_type === 'rental';
      const expectedType = isRental ? 'paid_rent' : 'paid_order';
      const key = `${order.id}:${expectedType}`;

      // Lewati jika notifikasi sudah ada
      if (existingSet.has(key)) {
        results.already_exists++;
        continue;
      }

      try {
        // Ambil nama produk
        const productName = await getProductName(supabase, order.product_id, order.order_type);

        // Buat notifikasi admin yang terlewat
        const adminNotif = await createOrderNotification(
          supabase,
          order.id,
          order.customer_name || 'Guest Customer',
          productName,
          Number(order.amount || 0),
          'paid_order', // akan otomatis dikonversi ke paid_rent jika rental
          order.customer_phone,
          order.order_type,
          order.rental_duration
        );

        if (adminNotif) {
          results.admin_notifications_created++;
          console.log(`[NotifSync] ✅ Notifikasi admin dibuat untuk order ${order.id}`);
        }

        // Juga buat notifikasi customer jika belum ada
        try {
          await createCustomerPaymentNotification(supabase, {
            id: order.id,
            user_id: order.user_id,
            customer_name: order.customer_name,
            order_type: order.order_type,
            amount: order.amount,
            product_id: order.product_id,
          }, productName);
          results.customer_notifications_created++;
        } catch (custErr: any) {
          // Non-blocking: customer notification gagal bukan masalah kritis
          console.warn(`[NotifSync] Customer notification gagal untuk order ${order.id}:`, custErr.message);
        }

      } catch (err: any) {
        console.error(`[NotifSync] Gagal proses order ${order.id}:`, err);
        results.errors.push(`Order ${order.id}: ${err.message}`);
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`[NotifSync] Selesai: ${results.admin_notifications_created} notif dibuat, ${results.already_exists} sudah ada, ${results.errors.length} error (${duration}ms)`);

    return res.status(200).json({
      success: true,
      ...results,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[NotifSync] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      ...results
    });
  }
}
