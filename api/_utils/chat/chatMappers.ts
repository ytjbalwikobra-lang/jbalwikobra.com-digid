/**
 * chatMappers.ts
 * Fungsi mapper data dan shared utilities untuk chat service.
 * Mengkonversi snake_case dari database ke camelCase TypeScript.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog,
  ChatRating,
  ChatSenderType,
  ChatActivityAction
} from '../../../src/types/chat';

// Re-export tipe yang sering digunakan
export type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog,
  ChatRating,
  ChatSenderType,
  ChatActivityAction
};

// Tipe lain yang dibutuhkan oleh sub-modules
export type { ChatConversationStatus, ChatMessageType, ChatAdminRole, ChatStatistics } from '../../../src/types/chat';

// =============================================================================
// DATA MAPPERS
// =============================================================================

export function mapConversation(row: any): ChatConversation {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    userId: row.user_id,
    status: row.status,
    subject: row.subject,
    topic: row.topic || 'lainnya',
    gameTitle: row.game_title,
    assignedAdminId: row.assigned_admin_id,
    assignedAdmin: row.assigned_admin ? {
      id: row.assigned_admin.id,
      name: row.assigned_admin.name,
      email: row.assigned_admin.email,
      isAdmin: row.assigned_admin.is_admin
    } : undefined,
    orderId: row.order_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at
  };
}

export function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    senderName: row.sender_name,
    message: row.message,
    messageType: row.message_type,
    attachmentUrl: row.attachment_url,
    attachmentName: row.attachment_name,
    attachmentType: row.attachment_type,
    isRead: row.is_read,
    readAt: row.read_at,
    metadata: row.metadata,
    createdAt: row.created_at
  };
}

export function mapAdminParticipant(row: any): ChatAdminParticipant {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    adminId: row.admin_id,
    role: row.role,
    isActive: row.is_active,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    admin: row.admin ? {
      id: row.admin.id,
      name: row.admin.name,
      email: row.admin.email,
      isAdmin: row.admin.is_admin
    } : undefined
  };
}

export function mapActivityLog(row: any): ChatActivityLog {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  };
}

export function mapRating(row: any): ChatRating {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    rating: row.rating,
    feedback: row.feedback,
    ratedAdminId: row.rated_admin_id,
    createdAt: row.created_at
  };
}

export function mapCannedResponse(row: any) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    category: row.category,
    shortcut: row.shortcut,
    usageCount: row.usage_count ?? 0,
    lastUsedAt: row.last_used_at,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =============================================================================
// ACTIVITY LOG (digunakan oleh banyak service, jadi ditaruh di shared)
// =============================================================================

/** Log aktivitas chat — fire-and-forget, non-critical */
export async function logActivity(
  sb: SupabaseClient,
  data: {
    conversationId?: string;
    messageId?: string;
    actorType: ChatSenderType;
    actorId?: string;
    actorName?: string;
    action: ChatActivityAction;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    await sb.from('chat_activity_logs').insert({
      conversation_id: data.conversationId,
      message_id: data.messageId,
      actor_type: data.actorType,
      actor_id: data.actorId,
      actor_name: data.actorName,
      action: data.action,
      details: data.details || {},
      ip_address: data.ipAddress,
      user_agent: data.userAgent
    });
  } catch (err) {
    console.error('[ChatService] Error logging activity:', err);
  }
}

/** Ambil log aktivitas untuk percakapan */
export async function getActivityLogs(
  sb: SupabaseClient,
  conversationId: string,
  limit: number = 100
): Promise<ChatActivityLog[]> {
  try {
    const { data, error } = await sb
      .from('chat_activity_logs')
      .select('id, conversation_id, message_id, actor_type, actor_id, actor_name, action, details, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ChatService] Error fetching activity logs:', error);
      return [];
    }

    return (data || []).map(mapActivityLog);
  } catch (err) {
    console.error('[ChatService] Exception fetching activity logs:', err);
    return [];
  }
}
