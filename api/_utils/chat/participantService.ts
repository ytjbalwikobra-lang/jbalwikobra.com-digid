/**
 * participantService.ts
 * Fungsi untuk admin participants dan rating percakapan.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapAdminParticipant,
  mapRating,
  logActivity,
  type ChatAdminParticipant,
  type ChatAdminRole,
  type ChatRating
} from './chatMappers.js';

// =============================================================================
// ADMIN PARTICIPANT FUNCTIONS
// =============================================================================

/** Tambah admin participant ke percakapan — dengan paralel DB calls */
export async function addAdminParticipant(
  sb: SupabaseClient,
  conversationId: string,
  adminId: string,
  role: ChatAdminRole = 'participant'
): Promise<boolean> {
  try {
    const ops: Promise<any>[] = [];
    
    // Demote existing primary jika yang baru adalah primary
    if (role === 'primary') {
      ops.push(
        sb.from('chat_admin_participants')
          .update({ role: 'participant' })
          .eq('conversation_id', conversationId)
          .eq('role', 'primary')
      );
    }

    ops.push(
      sb.from('chat_admin_participants')
        .upsert({
          conversation_id: conversationId,
          admin_id: adminId,
          role,
          is_active: true,
          joined_at: new Date().toISOString(),
          left_at: null
        }, {
          onConflict: 'conversation_id,admin_id'
        })
    );

    const results = await Promise.all(ops);
    const upsertResult = results[results.length - 1];

    if (upsertResult.error) {
      console.error('[ChatService] Error adding admin participant:', upsertResult.error);
      return false;
    }

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId,
      actorType: 'admin',
      actorId: adminId,
      action: 'admin_joined',
      details: { role }
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return true;
  } catch (err) {
    console.error('[ChatService] Exception adding admin participant:', err);
    return false;
  }
}

/** Hapus admin participant dari percakapan */
export async function removeAdminParticipant(
  sb: SupabaseClient,
  conversationId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_admin_participants')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('admin_id', adminId);

    if (error) {
      console.error('[ChatService] Error removing admin participant:', error);
      return false;
    }

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId,
      actorType: 'admin',
      actorId: adminId,
      action: 'admin_left',
      details: {}
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return true;
  } catch (err) {
    console.error('[ChatService] Exception removing admin participant:', err);
    return false;
  }
}

/** Ambil admin participants untuk percakapan */
export async function getAdminParticipants(
  sb: SupabaseClient,
  conversationId: string,
  activeOnly: boolean = true
): Promise<ChatAdminParticipant[]> {
  try {
    let query = sb
      .from('chat_admin_participants')
      .select(`
        *,
        admin:users!chat_admin_participants_admin_id_fkey(id, name, email, is_admin)
      `)
      .eq('conversation_id', conversationId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ChatService] Error fetching participants:', error);
      return [];
    }

    return (data || []).map(mapAdminParticipant);
  } catch (err) {
    console.error('[ChatService] Exception fetching participants:', err);
    return [];
  }
}

// =============================================================================
// RATING FUNCTIONS
// =============================================================================

/** Submit rating untuk percakapan */
export async function submitRating(
  sb: SupabaseClient,
  data: {
    conversationId: string;
    rating: number;
    feedback?: string;
    ratedAdminId?: string;
  }
): Promise<ChatRating | null> {
  try {
    const { data: ratingData, error } = await sb
      .from('chat_ratings')
      .insert({
        conversation_id: data.conversationId,
        rating: data.rating,
        feedback: data.feedback,
        rated_admin_id: data.ratedAdminId
      })
      .select('id, conversation_id, rating, feedback, rated_admin_id, created_at')
      .single();

    if (error) {
      console.error('[ChatService] Error submitting rating:', error);
      return null;
    }

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId: data.conversationId,
      actorType: 'customer',
      action: 'rating_submitted',
      details: { rating: data.rating }
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return mapRating(ratingData);
  } catch (err) {
    console.error('[ChatService] Exception submitting rating:', err);
    return null;
  }
}
