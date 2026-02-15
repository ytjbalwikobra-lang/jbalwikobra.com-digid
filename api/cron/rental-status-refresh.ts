/**
 * Cron Job: Refresh rental statuses + create admin notifications
 * Berjalan setiap 15 menit untuk:
 * 1. Update rental_status (active → expiring_soon → expired)
 * 2. Create notifikasi admin untuk rental yang akan berakhir
 * 
 * Schedule: setiap 15 menit
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createOrderNotification, getProductName } from '../_utils/adminNotificationService.js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\r\n\\]/g, '').trim();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface RentalOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_id: string | null;
  product_name: string;
  amount: number;
  rental_duration: string;
  rental_start_date: string;
  rental_end_date: string;
  rental_status: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verifikasi cron secret untuk keamanan
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret-2024'}`;
  
  if (authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const now = new Date();
  const nowMs = now.getTime();
  let updatedCount = 0;
  let notificationsCreated = 0;

  try {
    console.log('[rental-status-refresh] Starting refresh at', now.toISOString());

    // ===== STEP 1: Update active → expiring_soon =====
    // Ambil semua rental aktif untuk cek threshold 10%
    const { data: activeRentals } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, product_id, product_name, amount, rental_duration, rental_start_date, rental_end_date, rental_status')
      .eq('order_type', 'rental')
      .eq('rental_status', 'active')
      .gt('rental_end_date', now.toISOString());

    if (activeRentals && activeRentals.length > 0) {
      // Filter: sisa waktu < 10% dari total durasi
      const rentalsToExpireSoon: RentalOrder[] = activeRentals.filter(r => {
        const start = new Date(r.rental_start_date).getTime();
        const end = new Date(r.rental_end_date).getTime();
        const totalDuration = end - start;
        const remaining = end - nowMs;
        return remaining > 0 && remaining < totalDuration * 0.1;
      });

      if (rentalsToExpireSoon.length > 0) {
        const ids = rentalsToExpireSoon.map(r => r.id);
        
        // Update status ke expiring_soon
        const { data: updatedRentals } = await supabase
          .from('orders')
          .update({ rental_status: 'expiring_soon' })
          .in('id', ids)
          .select('id');
        
        updatedCount += updatedRentals?.length || 0;

        // Create notification untuk setiap rental yang berubah ke expiring_soon
        for (const rental of rentalsToExpireSoon) {
          try {
            const productName = await getProductName(supabase, rental.product_id, 'rental');
            
            await createOrderNotification(
              supabase,
              rental.id,
              rental.customer_name || 'Customer',
              productName,
              Number(rental.amount || 0),
              'expiring_rent', // type baru untuk notifikasi
              rental.customer_phone,
              'rental',
              rental.rental_duration
            );
            
            notificationsCreated++;
            console.log(`[rental-status-refresh] Notification created for expiring rental: ${rental.id}`);
          } catch (notifError) {
            console.error('[rental-status-refresh] Failed to create notification for', rental.id, notifError);
          }
        }

        console.log(`[rental-status-refresh] Updated ${updatedRentals?.length || 0} rentals to expiring_soon`);
      }
    }

    // ===== STEP 2: Update expiring_soon/active → expired =====
    const { data: expiredRentals } = await supabase
      .from('orders')
      .update({ rental_status: 'expired' })
      .eq('order_type', 'rental')
      .in('rental_status', ['active', 'expiring_soon'])
      .lte('rental_end_date', now.toISOString())
      .select('id, customer_name, product_name');

    updatedCount += expiredRentals?.length || 0;

    if (expiredRentals && expiredRentals.length > 0) {
      console.log(`[rental-status-refresh] Updated ${expiredRentals.length} rentals to expired`);
    }

    // ===== Response =====
    const summary = {
      success: true,
      timestamp: now.toISOString(),
      rentalsUpdated: updatedCount,
      notificationsCreated: notificationsCreated,
      details: {
        expiringSoon: activeRentals?.length || 0,
        expired: expiredRentals?.length || 0
      }
    };

    console.log('[rental-status-refresh] Summary:', summary);
    return res.status(200).json(summary);

  } catch (error: any) {
    console.error('[rental-status-refresh] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      timestamp: now.toISOString()
    });
  }
}
