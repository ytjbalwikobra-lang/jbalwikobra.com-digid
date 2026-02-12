/**
 * Cron Job: Auto-close percakapan chat yang sudah tidak aktif
 * 
 * Memeriksa percakapan dengan status 'resolved' yang tidak ada aktivitas
 * selama 48 jam dan mengubah statusnya menjadi 'closed'.
 * 
 * Juga menutup percakapan 'open' yang tidak ada pesan selama 7 hari
 * (customer membuat tapi tidak pernah direspons/ditinggalkan).
 * 
 * Jadwal: Setiap 6 jam (via vercel.json crons)
 * 
 * Endpoint: GET /api/cron/chat-cleanup
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
      console.error('[ChatCleanup] Akses tidak sah');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const startTime = Date.now();
  const results = {
    resolved_closed: 0,
    stale_open_closed: 0,
    errors: [] as string[]
  };

  try {
    const supabase = getSupabase();
    const now = new Date();

    // 1. Tutup percakapan 'resolved' yang tidak aktif > 48 jam
    const resolvedCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: resolvedConvs, error: resolvedErr } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('status', 'resolved')
      .lt('updated_at', resolvedCutoff);

    if (resolvedErr) {
      results.errors.push(`Gagal query resolved: ${resolvedErr.message}`);
    } else if (resolvedConvs && resolvedConvs.length > 0) {
      const ids = resolvedConvs.map(c => c.id);
      const { error: updateErr, count } = await supabase
        .from('chat_conversations')
        .update({ 
          status: 'closed', 
          closed_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .in('id', ids);

      if (updateErr) {
        results.errors.push(`Gagal tutup resolved: ${updateErr.message}`);
      } else {
        results.resolved_closed = count ?? ids.length;

        // Log aktivitas untuk setiap percakapan yang ditutup
        const activityLogs = ids.map(id => ({
          conversation_id: id,
          actor_type: 'system',
          actor_name: 'system_cron',
          action: 'conversation_closed',
          details: { from: 'resolved', to: 'closed', reason: 'auto_close_48h' },
          created_at: now.toISOString()
        }));

        await supabase
          .from('chat_activity_logs')
          .insert(activityLogs)
          .then(() => {}) // fire-and-forget
          .catch(() => {});
      }
    }

    // 2. Tutup percakapan 'open' yang tidak ada pesan selama > 7 hari
    const staleCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleConvs, error: staleErr } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('status', 'open')
      .lt('updated_at', staleCutoff);

    if (staleErr) {
      results.errors.push(`Gagal query stale open: ${staleErr.message}`);
    } else if (staleConvs && staleConvs.length > 0) {
      const ids = staleConvs.map(c => c.id);
      const { error: updateErr, count } = await supabase
        .from('chat_conversations')
        .update({ 
          status: 'closed', 
          closed_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .in('id', ids);

      if (updateErr) {
        results.errors.push(`Gagal tutup stale open: ${updateErr.message}`);
      } else {
        results.stale_open_closed = count ?? ids.length;

        const activityLogs = ids.map(id => ({
          conversation_id: id,
          actor_type: 'system',
          actor_name: 'system_cron',
          action: 'conversation_closed',
          details: { from: 'open', to: 'closed', reason: 'stale_7_days' },
          created_at: now.toISOString()
        }));

        await supabase
          .from('chat_activity_logs')
          .insert(activityLogs)
          .then(() => {})
          .catch(() => {});
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ChatCleanup] Selesai dalam ${duration}ms:`, results);

    return res.status(200).json({
      success: true,
      duration_ms: duration,
      ...results
    });

  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[ChatCleanup] Error setelah ${duration}ms:`, err);
    return res.status(500).json({
      success: false,
      duration_ms: duration,
      error: err.message,
      ...results
    });
  }
}
