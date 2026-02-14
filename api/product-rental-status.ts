/**
 * API publik: Status rental produk — tidak perlu autentikasi.
 * Mengembalikan info rental aktif, antrian, dan estimasi ketersediaan.
 * Endpoint: GET /api/product-rental-status?productId=xxx
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
  if (!productId) {
    return res.status(400).json({ error: 'Missing productId' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Refresh status rental yang kedaluwarsa
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

    // Ambil rental aktif untuk produk ini
    const { data: currentData } = await supabase
      .from('orders')
      .select('id, rental_duration, rental_start_date, rental_end_date, rental_status')
      .eq('product_id', productId)
      .eq('order_type', 'rental')
      .in('rental_status', ['active', 'expiring_soon'])
      .order('rental_end_date', { ascending: true })
      .limit(1);

    if (!currentData || currentData.length === 0) {
      // Tidak ada rental aktif — produk tersedia
      setCacheHeaders(res, { maxAge: 120, staleWhileRevalidate: 300 });
      return res.status(200).json({ success: true, data: null });
    }

    const current = currentData[0];

    // Hitung antrian — rental aktif lain dengan end_date lebih lama
    const { count: queueCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('order_type', 'rental')
      .in('rental_status', ['active', 'expiring_soon'])
      .gt('rental_end_date', current.rental_end_date);

    // Hanya kirim data yang aman untuk publik (tanpa order ID, tanpa info pelanggan)
    const publicData = {
      rentalDuration: current.rental_duration,
      rentalEndDate: current.rental_end_date,
      rentalStatus: current.rental_status,
      queueCount: queueCount || 0
    };

    // Cache 2 menit — status rental cukup Fresh
    setCacheHeaders(res, { maxAge: 120, staleWhileRevalidate: 300 });
    return res.status(200).json({ success: true, data: publicData });
  } catch (error) {
    console.error('[product-rental-status] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
