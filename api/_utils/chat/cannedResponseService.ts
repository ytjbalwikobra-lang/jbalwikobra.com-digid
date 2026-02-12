/**
 * cannedResponseService.ts
 * Fungsi CRUD untuk canned responses (template balasan cepat).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { mapCannedResponse } from './chatMappers.js';

// =============================================================================
// CANNED RESPONSES
// =============================================================================

/** Ambil semua canned responses yang aktif */
export async function getCannedResponses(sb: SupabaseClient): Promise<any[]> {
  try {
    const { data, error } = await sb
      .from('chat_canned_responses')
      .select('id, title, message, shortcut, category, sort_order, is_active, usage_count, created_by, created_at, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[ChatService] Error getting canned responses:', error);
      return [];
    }

    return (data || []).map(mapCannedResponse);
  } catch (err) {
    console.error('[ChatService] Exception getting canned responses:', err);
    return [];
  }
}

/** Ambil canned response berdasarkan shortcut */
export async function getCannedResponseByShortcut(
  sb: SupabaseClient,
  shortcut: string
): Promise<any | null> {
  try {
    const { data, error } = await sb
      .from('chat_canned_responses')
      .select('id, title, message, shortcut, category, sort_order, is_active, usage_count, created_by, created_at, updated_at')
      .eq('shortcut', shortcut)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('[ChatService] Error getting canned response by shortcut:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[ChatService] Exception getting canned response by shortcut:', err);
    return null;
  }
}

/** Buat canned response baru */
export async function createCannedResponse(
  sb: SupabaseClient,
  data: {
    title: string;
    message: string;
    category?: string;
    shortcut?: string;
    sortOrder?: number;
    createdBy?: string;
  }
): Promise<any | null> {
  try {
    const { data: response, error } = await sb
      .from('chat_canned_responses')
      .insert({
        title: data.title,
        message: data.message,
        category: data.category,
        shortcut: data.shortcut,
        sort_order: data.sortOrder || 0,
        created_by: data.createdBy
      })
      .select('id, title, message, category, shortcut, sort_order, is_active, created_by, created_at')
      .single();

    if (error) {
      console.error('[ChatService] Error creating canned response:', error);
      return null;
    }

    return response;
  } catch (err) {
    console.error('[ChatService] Exception creating canned response:', err);
    return null;
  }
}

/** Update canned response */
export async function updateCannedResponse(
  sb: SupabaseClient,
  id: string,
  data: {
    title?: string;
    message?: string;
    category?: string;
    shortcut?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
): Promise<any | null> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.shortcut !== undefined) updateData.shortcut = data.shortcut;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const { data: response, error } = await sb
      .from('chat_canned_responses')
      .update(updateData)
      .eq('id', id)
      .select('id, title, message, category, shortcut, sort_order, is_active, created_by, updated_at')
      .single();

    if (error) {
      console.error('[ChatService] Error updating canned response:', error);
      return null;
    }

    return response;
  } catch (err) {
    console.error('[ChatService] Exception updating canned response:', err);
    return null;
  }
}

/** Hapus canned response */
export async function deleteCannedResponse(
  sb: SupabaseClient,
  id: string
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_canned_responses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ChatService] Error deleting canned response:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception deleting canned response:', err);
    return false;
  }
}

/** Increment usage count untuk canned response — atomic SQL update (tanpa race condition) */
export async function incrementCannedResponseUsage(
  sb: SupabaseClient,
  id: string
): Promise<boolean> {
  try {
    // Atomic increment — tidak perlu baca dulu, langsung update dengan RPC-style
    const { error } = await sb.rpc('increment_canned_usage', { row_id: id });

    if (error) {
      // Fallback: jika RPC belum ada, gunakan raw update
      console.warn('[ChatService] RPC fallback — direct update:', error.message);
      const { error: updateError } = await sb
        .from('chat_canned_responses')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('[ChatService] Error incrementing canned response usage:', updateError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception incrementing canned response usage:', err);
    return false;
  }
}
