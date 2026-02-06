import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth } from './_middleware/authMiddleware.js';

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

function respond(res: VercelResponse, status: number, body: any, cacheable = false) {
  res.setHeader('Content-Type', 'application/json');
  if (cacheable) {
    // Cache notifications for 2 minutes to reduce egress
    res.setHeader('Cache-Control', 'private, max-age=120, stale-while-revalidate=60');
  }
  res.status(status).send(JSON.stringify(body));
}

function parseLimit(v: any, def: number) { const n = parseInt(v as string, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : def; } // Max 100 to reduce egress

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;

  try {
    const ip = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown').toString();
    if (!allow(ip)) return respond(res, 429, { error: 'rate_limited' });

    if (!sb) return respond(res, 500, { error: 'server_not_configured' });

    const action = (req.query.action as string) || (req.method === 'GET' ? 'recent' : 'unknown');

    // ✅ SECURITY: Require admin authentication for all actions except create-demo with token
    if (action !== 'create-demo') {
      const auth = await validateAdminAuth(req);
      if (!auth.valid) {
        console.warn('[API /api/admin-notifications] Unauthorized access attempt:', {
          error: auth.error,
          action,
          ip,
          userAgent: req.headers['user-agent']
        });
        return respond(res, 401, { 
          error: 'unauthorized', 
          message: auth.error || 'Authentication required'
        });
      }
    }

    if (action === 'recent' && req.method === 'GET') {
      const limit = parseLimit(req.query.limit, 10);
      
      const { data, error } = await sb
        .from('admin_notifications')
        .select('id, type, title, message, order_id, user_id, product_name, amount, customer_name, created_at, is_read, metadata')
        .is('metadata->archived', null) // Exclude archived notifications to reduce egress
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[API /api/admin-notifications] Database error:', error);
        return respond(res, 500, { error: 'db_error', details: error.message });
      }

      // Optionally filter out obvious debug/test entries at the edge
      const filtered = (data || []).filter((n: any) => {
        const title = (n.title || '').toString().toLowerCase();
        const message = (n.message || '').toString().toLowerCase();
        const md = n.metadata || {};
        const isDebug = md.test === true || md.debug_mode === true || md.auto_read === true || title.includes('[debug]') || title.includes('test') || message.includes('[debug mode]');
        return !isDebug;
      });
      return respond(res, 200, { data: filtered }, true); // Enable HTTP cache to reduce egress
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

    // Enhancement D: Server-side notification creation from admin client
    if (action === 'create' && req.method === 'POST') {
      const { type, title, message, order_id, user_id, customer_name, product_name, amount, metadata } = (req.body || {}) as any;
      
      if (!type || !title || !message) {
        return respond(res, 400, { error: 'missing_fields', message: 'type, title, and message are required' });
      }
      
      const validTypes = ['new_order', 'paid_order', 'new_user', 'order_cancelled', 'new_review', 'system', 'new_rent', 'paid_rent'];
      if (!validTypes.includes(type)) {
        return respond(res, 400, { error: 'invalid_type', message: `type must be one of: ${validTypes.join(', ')}` });
      }
      
      const { data, error } = await sb
        .from('admin_notifications')
        .insert({
          type,
          title: String(title).slice(0, 200),
          message: String(message).slice(0, 1000),
          order_id: order_id || null,
          user_id: user_id || null,
          customer_name: customer_name ? String(customer_name).slice(0, 100) : null,
          product_name: product_name ? String(product_name).slice(0, 200) : null,
          amount: typeof amount === 'number' ? amount : null,
          is_read: false,
          metadata: metadata || { priority: 'normal' },
        })
        .select('id, created_at')
        .single();
      
      if (error) return respond(res, 500, { error: 'db_error', details: error.message });
      return respond(res, 201, { success: true, id: data?.id, created_at: data?.created_at });
    }

    // Enhancement D: Server-side notification deletion
    if (action === 'delete' && req.method === 'POST') {
      const { id } = (req.body || {}) as { id?: string };
      if (!id) return respond(res, 400, { error: 'missing_id' });
      
      const { error } = await sb
        .from('admin_notifications')
        .delete()
        .eq('id', id);
      
      if (error) return respond(res, 500, { error: 'db_error', details: error.message });
      return respond(res, 200, { success: true });
    }

    return respond(res, 400, { error: 'unknown_action' });
  } catch (e: any) {
    console.error('[api/admin-notifications] error', e);
    return respond(res, 500, { error: 'internal_error', message: e.message });
  }
}
