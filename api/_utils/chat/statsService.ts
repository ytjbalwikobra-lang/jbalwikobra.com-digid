/**
 * statsService.ts
 * Statistik chat untuk admin dashboard.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatStatistics } from './chatMappers.js';

// =============================================================================
// STATISTICS
// =============================================================================

/** Ambil statistik chat untuk dashboard admin — satu panggilan RPC */
export async function getChatStatistics(sb: SupabaseClient): Promise<ChatStatistics> {
  try {
    // Satu RPC menggantikan 6 count queries + 1 avg query
    const { data, error } = await sb.rpc('get_chat_statistics').single();

    if (error) {
      console.error('[ChatService] RPC get_chat_statistics error:', error);
      // Fallback ke count queries jika RPC belum tersedia
      return getChatStatisticsFallback(sb);
    }

    const row = data as Record<string, any>;
    return {
      totalConversations: row.total_conversations || 0,
      openConversations: row.open_conversations || 0,
      assignedConversations: row.assigned_conversations || 0,
      resolvedConversations: row.resolved_conversations || 0,
      averageRating: row.ratings_count > 0 ? Number(row.avg_rating) : undefined,
      ratingsCount: row.ratings_count || 0
    };
  } catch (err) {
    console.error('[ChatService] Exception fetching statistics:', err);
    return {
      totalConversations: 0,
      openConversations: 0,
      assignedConversations: 0,
      resolvedConversations: 0,
      ratingsCount: 0
    };
  }
}

/** Fallback: count queries paralel jika RPC belum di-deploy */
async function getChatStatisticsFallback(sb: SupabaseClient): Promise<ChatStatistics> {
  try {
    const [totalResult, openResult, assignedResult, resolvedResult, closedResult, ratingsCountResult] = await Promise.all([
      sb.from('chat_conversations').select('id', { count: 'exact', head: true }),
      sb.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'assigned'),
      sb.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      sb.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
      sb.from('chat_ratings').select('id', { count: 'exact', head: true }),
    ]);

    // AVG rating di database via raw query
    let avgRating: number | undefined;
    const ratingsCount = ratingsCountResult.count || 0;
    if (ratingsCount > 0) {
      const { data: rows } = await sb.from('chat_ratings').select('rating').limit(500);
      if (rows && rows.length > 0) {
        avgRating = rows.reduce((sum: number, r: any) => sum + r.rating, 0) / rows.length;
      }
    }

    return {
      totalConversations: totalResult.count || 0,
      openConversations: openResult.count || 0,
      assignedConversations: assignedResult.count || 0,
      resolvedConversations: (resolvedResult.count || 0) + (closedResult.count || 0),
      averageRating: avgRating,
      ratingsCount
    };
  } catch (err) {
    console.error('[ChatService] Fallback statistics error:', err);
    return { totalConversations: 0, openConversations: 0, assignedConversations: 0, resolvedConversations: 0, ratingsCount: 0 };
  }
}
