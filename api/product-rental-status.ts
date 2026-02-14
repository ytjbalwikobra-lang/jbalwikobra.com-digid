/**
 * API publik: Status rental produk — tidak perlu autentikasi.
 * Mendukung single product dan batch:
 *   GET /api/product-rental-status?productId=xxx        → single
 *   GET /api/product-rental-status?productIds=a,b,c     → batch (maks 50)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/** Refresh rental status yang kedaluwarsa (on-demand, bukan cron) */
async function refreshExpiredStatuses() {
  if (!supabase) return;
  const now = new Date().toISOString();
  const threshold24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // active → expiring_soon (24 jam sebelum habis)
  await supabase
    .from('orders')
    .update({ rental_status: 'expiring_soon' })
    .eq('order_type', 'rental')
    .eq('rental_status', 'active')
    .lte('rental_end_date', threshold24h)
    .gt('rental_end_date', now);

  // active/expiring_soon → expired (sudah lewat)
  await supabase
    .from('orders')
    .update({ rental_status: 'expired' })
    .eq('order_type', 'rental')
    .in('rental_status', ['active', 'expiring_soon'])
    .lte('rental_end_date', now);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Dukung batch: ?productIds=a,b,c atau single: ?productId=xxx
  const singleId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
  const batchIds = typeof req.query.productIds === 'string' 
    ? req.query.productIds.split(',').map(id => id.trim()).filter(Boolean).slice(0, 50) 
    : [];

  const isBatch = batchIds.length > 0;
  const ids = isBatch ? batchIds : singleId ? [singleId] : [];

  if (ids.length === 0) {
    return res.status(400).json({ error: 'Missing productId or productIds' });
  }

  try {
    await refreshExpiredStatuses();

    // Ambil semua rental aktif untuk product IDs yang diminta
    const { data: activeRentals } = await supabase
      .from('orders')
      .select('product_id, rental_duration, rental_end_date, rental_status')
      .in('product_id', ids)
      .eq('order_type', 'rental')
      .in('rental_status', ['active', 'expiring_soon'])
      .order('rental_end_date', { ascending: true });

    // Cache 2 menit
    setCacheHeaders(res, { maxAge: 120, staleWhileRevalidate: 300 });

    if (isBatch) {
      // Batch response: Map<productId, statusData | null>
      const result: Record<string, { rentalDuration: string; rentalEndDate: string; rentalStatus: string; queueCount: number } | null> = {};
      
      for (const id of ids) {
        const rentalsForProduct = (activeRentals || []).filter(r => r.product_id === id);
        if (rentalsForProduct.length === 0) {
          result[id] = null;
        } else {
          const current = rentalsForProduct[0];
          result[id] = {
            rentalDuration: current.rental_duration,
            rentalEndDate: current.rental_end_date,
            rentalStatus: current.rental_status,
            queueCount: Math.max(0, rentalsForProduct.length - 1)
          };
        }
      }

      return res.status(200).json({ success: true, data: result });
    } else {
      // Single response (backward compatible)
      const rentals = (activeRentals || []).filter(r => r.product_id === singleId);
      if (rentals.length === 0) {
        return res.status(200).json({ success: true, data: null });
      }
      const current = rentals[0];
      return res.status(200).json({
        success: true,
        data: {
          rentalDuration: current.rental_duration,
          rentalEndDate: current.rental_end_date,
          rentalStatus: current.rental_status,
          queueCount: Math.max(0, rentals.length - 1)
        }
      });
    }
  } catch (error) {
    console.error('[product-rental-status] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
