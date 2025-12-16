import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Service-role client (server only)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const sb = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

// Simple rate limiter
const rate = new Map<string, { c: number; t: number }>();
const WINDOW = 10_000; // 10s
const LIMIT = 60; // per window

function allow(ip: string) {
  const now = Date.now();
  const e = rate.get(ip);
  if (!e || now - e.t > WINDOW) { rate.set(ip, { c: 1, t: now }); return true; }
  if (e.c >= LIMIT) return false; e.c++; return true;
}

function respond(res: VercelResponse, status: number, body: any) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(JSON.stringify(body));
}

function parseLimit(v: any, def: number) { const n = parseInt(v as string, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : def; }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ip = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown').toString();
    if (!allow(ip)) return respond(res, 429, { error: 'rate_limited' });

    if (!sb) return respond(res, 500, { error: 'server_not_configured' });

    const action = (req.query.action as string) || (req.method === 'GET' ? 'recent' : 'unknown');

    if (action === 'recent' && req.method === 'GET') {
      const limit = parseLimit(req.query.limit, 10);
      const { data, error } = await sb
        .from('admin_notifications')
        .select('id, type, title, message, order_id, user_id, product_name, amount, customer_name, created_at, is_read, metadata')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return respond(res, 500, { error: 'db_error', details: error.message });

      // Optionally filter out obvious debug/test entries at the edge
      const filtered = (data || []).filter((n: any) => {
        const title = (n.title || '').toString().toLowerCase();
        const message = (n.message || '').toString().toLowerCase();
        const md = n.metadata || {};
        const isDebug = md.test === true || md.debug_mode === true || md.auto_read === true || title.includes('[debug]') || title.includes('test') || message.includes('[debug mode]');
        return !isDebug;
      });
      return respond(res, 200, { data: filtered });
    }

    if (action === 'mark-read' && req.method === 'POST') {
      const { id } = (req.body || {}) as { id?: string };
      if (!id) return respond(res, 400, { error: 'missing_id' });
      const { data, error } = await sb
        .from('admin_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id,is_read')
        .single();
      if (error) return respond(res, 500, { error: 'db_error', details: error.message });
      return respond(res, 200, { success: true, data });
    }

    if (action === 'mark-all' && req.method === 'POST') {
      const { data, error } = await sb
        .from('admin_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('is_read', false)
        .select('id');
      if (error) return respond(res, 500, { error: 'db_error', details: error.message });
      return respond(res, 200, { success: true, count: (data || []).length });
    }

    // Create a demo notification for testing the floating UI
    if (action === 'create-demo' && req.method === 'POST') {
      const token = (req.headers['x-admin-notif-token'] as string) || (req.body && (req.body as any).token);
      const expected = process.env.ADMIN_NOTIF_TEST_TOKEN || process.env.ADMIN_TEST_TOKEN;
      if (!expected || token !== expected) {
        return respond(res, 401, { error: 'unauthorized' });
      }

      const now = new Date();
      const payload = {
        type: 'new_order',
        title: 'Notifikasi Pesanan Baru',
        message: `Pesanan baru dari Demo User, produk Paket Premium senilai Rp150.000, pesanan belum dibayar, mohon tunggu pembayaran.`,
        order_id: null,
        customer_name: 'Demo User',
        product_name: 'Paket Premium',
        amount: 150000,
        is_read: false,
        created_at: now.toISOString(),
        metadata: { priority: 'normal', category: 'order' }
      } as any;

      const { data, error } = await sb
        .from('admin_notifications')
        .insert(payload)
        .select('id, created_at')
        .single();

      if (error) return respond(res, 500, { error: 'db_error', details: error.message });
      return respond(res, 200, { success: true, id: data?.id, created_at: data?.created_at });
    }

    return respond(res, 400, { error: 'unknown_action' });
  } catch (e: any) {
    console.error('[api/admin-notifications] error', e);
    return respond(res, 500, { error: 'internal_error', message: e.message });
  }
}
