/**
 * conversationService.ts
 * Fungsi CRUD untuk chat conversations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapConversation,
  mapMessage,
  logActivity,
  type ChatConversation,
  type ChatConversationStatus
} from './chatMappers.js';

import { addAdminParticipant } from './participantService.js';

// =============================================================================
// CONVERSATION FUNCTIONS
// =============================================================================

/** Buat percakapan baru */
export async function createConversation(
  sb: SupabaseClient,
  data: {
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    userId?: string;
    subject?: string;
    topic?: string;
    gameTitle?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ChatConversation | null> {
  try {
    const { data: conversation, error } = await sb
      .from('chat_conversations')
      .insert({
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        user_id: data.userId,
        subject: data.subject,
        topic: data.topic || 'lainnya',
        game_title: data.gameTitle,
        order_id: data.orderId,
        metadata: data.metadata || {},
        status: 'open'
      })
      .select('id, customer_email, customer_name, customer_phone, user_id, subject, topic, game_title, order_id, status, metadata, created_at')
      .single();

    if (error) {
      console.error('[ChatService] Error creating conversation:', error);
      return null;
    }

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId: conversation.id,
      actorType: 'customer',
      actorName: data.customerName || data.customerEmail || 'Anonymous',
      action: 'conversation_started',
      details: { subject: data.subject }
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return mapConversation(conversation);
  } catch (err) {
    console.error('[ChatService] Exception creating conversation:', err);
    return null;
  }
}

/** Ambil percakapan berdasarkan ID */
export async function getConversation(
  sb: SupabaseClient,
  conversationId: string
): Promise<ChatConversation | null> {
  try {
    const { data, error } = await sb
      .from('chat_conversations')
      .select(`
        *,
        assigned_admin:users!chat_conversations_assigned_admin_id_fkey(id, name, email, is_admin)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('[ChatService] Error fetching conversation:', error);
      return null;
    }

    return mapConversation(data);
  } catch (err) {
    console.error('[ChatService] Exception fetching conversation:', err);
    return null;
  }
}

/** Daftar percakapan dengan filter opsional */
export async function listConversations(
  sb: SupabaseClient,
  options: {
    status?: ChatConversationStatus | ChatConversationStatus[];
    assignedAdminId?: string;
    unassigned?: boolean;
    adminRole?: string;
    currentAdminId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ conversations: ChatConversation[]; total: number }> {
  try {
    let query = sb
      .from('chat_conversations')
      .select(`
        *,
        assigned_admin:users!chat_conversations_assigned_admin_id_fkey(id, name, email, is_admin)
      `, { count: 'exact' });

    // Filter berdasarkan status
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    if (options.assignedAdminId) {
      query = query.eq('assigned_admin_id', options.assignedAdminId);
    }

    if (options.unassigned) {
      query = query.is('assigned_admin_id', null);
    }

    // Role-based visibility: admin_viewer hanya lihat unassigned + miliknya
    if (options.adminRole === 'admin_viewer' && options.currentAdminId) {
      query = query.or(`assigned_admin_id.is.null,assigned_admin_id.eq.${options.currentAdminId}`);
    }

    // Pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    query = query
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ChatService] Error listing conversations:', error);
      return { conversations: [], total: 0 };
    }

    const mapped = (data || []).map(mapConversation);

    // Ambil pesan terakhir dan jumlah pesan belum dibaca — non-fatal
    if (mapped.length > 0) {
      try {
        const convIds = mapped.map(c => c.id);

        const { data: recentMessages, error: msgError } = await sb
          .from('chat_messages')
          .select('id, conversation_id, sender_type, sender_id, sender_name, message, message_type, attachment_url, attachment_name, attachment_type, is_read, read_at, metadata, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(convIds.length * 5);

        if (msgError) {
          console.error('[ChatService] Error fetching recent messages (non-fatal):', msgError);
        } else if (recentMessages && recentMessages.length > 0) {
          const lastByConv = new Map<string, any>();
          const unreadByConv = new Map<string, number>();
          
          for (const msg of recentMessages) {
            if (!lastByConv.has(msg.conversation_id)) {
              lastByConv.set(msg.conversation_id, msg);
            }
            if (msg.sender_type !== 'admin' && !msg.is_read) {
              unreadByConv.set(msg.conversation_id, (unreadByConv.get(msg.conversation_id) || 0) + 1);
            }
          }

          for (const conv of mapped) {
            const lastMsg = lastByConv.get(conv.id);
            if (lastMsg) {
              conv.lastMessage = mapMessage(lastMsg);
            }
            conv.unreadCount = unreadByConv.get(conv.id) || 0;
          }
        }
      } catch (batchErr) {
        console.error('[ChatService] Batch fetch last messages failed (non-fatal):', batchErr);
      }
    }

    return {
      conversations: mapped,
      total: count || 0
    };
  } catch (err) {
    console.error('[ChatService] Exception listing conversations:', err);
    return { conversations: [], total: 0 };
  }
}

/** Update status percakapan */
export async function updateConversationStatus(
  sb: SupabaseClient,
  conversationId: string,
  status: ChatConversationStatus,
  adminId?: string,
  adminName?: string
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = { status };

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    } else if (status === 'closed') {
      updates.closed_at = new Date().toISOString();
    }

    const { error } = await sb
      .from('chat_conversations')
      .update(updates)
      .eq('id', conversationId);

    if (error) {
      console.error('[ChatService] Error updating conversation status:', error);
      return false;
    }

    const actionMap: Record<ChatConversationStatus, string> = {
      'open': 'conversation_reopened',
      'assigned': 'conversation_assigned',
      'resolved': 'conversation_resolved',
      'closed': 'conversation_closed'
    };

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId,
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId,
      actorName: adminName || 'System',
      action: actionMap[status] as any,
      details: { newStatus: status }
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return true;
  } catch (err) {
    console.error('[ChatService] Exception updating conversation status:', err);
    return false;
  }
}

/** Assign percakapan ke admin — dengan paralel DB calls */
export async function assignConversation(
  sb: SupabaseClient,
  conversationId: string,
  adminId: string,
  assignedByAdminId?: string,
  assignedByAdminName?: string
): Promise<boolean> {
  try {
    const { data: current } = await sb
      .from('chat_conversations')
      .select('assigned_admin_id')
      .eq('id', conversationId)
      .single();

    const previousAdminId = current?.assigned_admin_id;
    const isReassignment = previousAdminId && previousAdminId !== adminId;

    // Paralel: update assignment + add participant
    const [updateResult] = await Promise.all([
      sb.from('chat_conversations')
        .update({
          assigned_admin_id: adminId,
          status: 'assigned'
        })
        .eq('id', conversationId),
      addAdminParticipant(sb, conversationId, adminId, 'primary')
    ]);

    if (updateResult.error) {
      console.error('[ChatService] Error assigning conversation:', updateResult.error);
      return false;
    }

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId,
      actorType: 'admin',
      actorId: assignedByAdminId || adminId,
      actorName: assignedByAdminName || 'Admin',
      action: isReassignment ? 'conversation_reassigned' : 'conversation_assigned',
      details: {
        newAdminId: adminId,
        previousAdminId: previousAdminId || null
      }
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return true;
  } catch (err) {
    console.error('[ChatService] Exception assigning conversation:', err);
    return false;
  }
}
