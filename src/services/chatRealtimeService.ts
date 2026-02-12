/**
 * Chat Realtime Service
 * 
 * Langganan realtime dan indikator mengetik untuk live chat.
 * Menggunakan Supabase Realtime untuk pembaruan langsung.
 */

import { supabase } from './supabase';
import { chatApiCall } from './chatApiHelper';
import type {
  ChatConversation,
  ChatMessage,
  ChatTypingIndicator,
  ChatConversationStatus
} from '../types/chat';

// =============================================================================
// LANGGANAN REALTIME
// =============================================================================

type MessageCallback = (message: ChatMessage) => void;
type ConversationCallback = (conversation: ChatConversation) => void;
type TypingCallback = (indicators: ChatTypingIndicator[]) => void;

/**
 * Langganan pesan baru dalam percakapan
 */
export function subscribeToMessages(
  conversationId: string,
  callback: MessageCallback
): { unsubscribe: () => void } {
  if (!supabase) {
    console.warn('[ChatService] Supabase tidak tersedia untuk realtime');
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`chat_messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        const msg = mapMessageFromRealtime(payload.new);
        callback(msg);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase?.removeChannel(channel);
    }
  };
}

/**
 * Langganan SEMUA pesan baru (tanpa filter percakapan).
 * Digunakan oleh admin untuk update preview pesan di daftar percakapan.
 */
export function subscribeToAllMessages(
  callback: MessageCallback
): { unsubscribe: () => void } {
  if (!supabase) {
    console.warn('[ChatService] Supabase tidak tersedia untuk realtime');
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel('chat_messages:all')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      (payload) => {
        const msg = mapMessageFromRealtime(payload.new);
        callback(msg);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase?.removeChannel(channel);
    }
  };
}

/**
 * Langganan pembaruan percakapan (perubahan status, pesan baru)
 */
export function subscribeToConversations(
  callback: ConversationCallback,
  filter?: { status?: ChatConversationStatus }
): { unsubscribe: () => void } {
  if (!supabase) {
    console.warn('[ChatService] Supabase tidak tersedia untuk realtime');
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel('chat_conversations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_conversations'
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const conv = mapConversationFromRealtime(payload.new);
          if (!filter?.status || conv.status === filter.status) {
            callback(conv);
          }
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase?.removeChannel(channel);
    }
  };
}

// =============================================================================
// INDIKATOR MENGETIK
// =============================================================================

/**
 * Kirim indikator mengetik (admin)
 */
export async function adminSetTyping(conversationId: string): Promise<void> {
  await chatApiCall('set-typing', 'POST', undefined, { conversationId });
}

/**
 * Hentikan indikator mengetik (admin)
 */
export async function adminStopTyping(conversationId: string): Promise<void> {
  await chatApiCall('stop-typing', 'POST', undefined, { conversationId });
}

/**
 * Kirim indikator mengetik (pelanggan - langsung Supabase untuk kecepatan)
 */
export async function customerSetTyping(conversationId: string, userName: string): Promise<void> {
  if (!supabase) return;
  
  await supabase
    .from('chat_typing_indicators')
    .upsert({
      conversation_id: conversationId,
      user_type: 'customer',
      user_name: userName,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'conversation_id,user_type,user_id'
    });
}

/**
 * Hentikan indikator mengetik (pelanggan)
 */
export async function customerStopTyping(conversationId: string): Promise<void> {
  if (!supabase) return;
  
  await supabase
    .from('chat_typing_indicators')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_type', 'customer');
}

/**
 * Langganan indikator mengetik untuk percakapan
 * Menggunakan data dari payload realtime langsung — tanpa refetch tambahan
 */
export function subscribeToTypingIndicators(
  conversationId: string,
  callback: TypingCallback
): { unsubscribe: () => void } {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  // Track indikator aktif secara lokal (menghindari refetch setiap event)
  const activeIndicators = new Map<string, ChatTypingIndicator>();
  const TYPING_TIMEOUT_MS = 10000; // 10 detik

  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_typing_indicators',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        const now = Date.now();

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          const updatedAt = new Date(row.updated_at).getTime();
          // Hanya tampilkan jika masih dalam window timeout
          if (now - updatedAt < TYPING_TIMEOUT_MS) {
            activeIndicators.set(row.id, {
              id: row.id,
              conversationId: row.conversation_id,
              userId: row.user_id,
              userType: row.user_type,
              userName: row.user_name,
              startedAt: row.started_at || row.created_at,
              updatedAt: row.updated_at
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const row = payload.old as any;
          if (row?.id) activeIndicators.delete(row.id);
        }

        // Filter indikator yang sudah expired
        const cutoff = new Date(now - TYPING_TIMEOUT_MS).toISOString();
        for (const [id, ind] of activeIndicators) {
          if (ind.updatedAt < cutoff) activeIndicators.delete(id);
        }

        callback(Array.from(activeIndicators.values()));
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase?.removeChannel(channel);
    }
  };
}

// =============================================================================
// MAPPER DATA (untuk payload realtime)
// =============================================================================

/** Map row database ke tipe ChatMessage */
function mapMessageFromRealtime(row: any): ChatMessage {
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

/** Map row database ke tipe ChatConversation */
function mapConversationFromRealtime(row: any): ChatConversation {
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
    orderId: row.order_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at
  };
}
