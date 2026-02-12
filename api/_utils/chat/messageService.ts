/**
 * messageService.ts
 * Fungsi untuk chat messages dan typing indicators.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapMessage,
  logActivity,
  type ChatMessage,
  type ChatSenderType,
  type ChatMessageType
} from './chatMappers.js';

// =============================================================================
// MESSAGE FUNCTIONS
// =============================================================================

/** Kirim pesan dalam percakapan */
export async function sendMessage(
  sb: SupabaseClient,
  data: {
    conversationId: string;
    senderType: ChatSenderType;
    senderId?: string;
    senderName: string;
    message: string;
    messageType?: ChatMessageType;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ChatMessage | null> {
  try {
    const { data: msg, error } = await sb
      .from('chat_messages')
      .insert({
        conversation_id: data.conversationId,
        sender_type: data.senderType,
        sender_id: data.senderId,
        sender_name: data.senderName,
        message: data.message,
        message_type: data.messageType || 'text',
        attachment_url: data.attachmentUrl,
        attachment_name: data.attachmentName,
        attachment_type: data.attachmentType,
        metadata: data.metadata || {}
      })
      .select('id, conversation_id, sender_type, sender_id, sender_name, message, message_type, attachment_url, attachment_name, attachment_type, metadata, created_at')
      .single();

    if (error) {
      console.error('[ChatService] Error sending message:', error);
      return null;
    }

    // Update last_message_at + log activity — paralel, fire-and-forget
    Promise.all([
      sb.from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', data.conversationId),
      logActivity(sb, {
        conversationId: data.conversationId,
        messageId: msg.id,
        actorType: data.senderType,
        actorId: data.senderId,
        actorName: data.senderName,
        action: 'message_sent',
        details: { messageType: data.messageType || 'text' }
      })
    ]).catch(err => console.error('[ChatService] sendMessage background ops error:', err));

    return mapMessage(msg);
  } catch (err) {
    console.error('[ChatService] Exception sending message:', err);
    return null;
  }
}

/** Ambil pesan untuk percakapan (dengan cursor pagination) */
export async function getMessages(
  sb: SupabaseClient,
  conversationId: string,
  options: {
    limit?: number;
    before?: string;
  } = {}
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  try {
    let query = sb
      .from('chat_messages')
      .select('id, conversation_id, sender_type, sender_id, sender_name, message, message_type, attachment_url, attachment_name, attachment_type, is_read, read_at, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (options.before) {
      query = query.lt('created_at', options.before);
    }

    const limit = options.limit || 50;
    query = query.limit(limit + 1); // Fetch +1 untuk cek hasMore

    const { data, error } = await query;

    if (error) {
      console.error('[ChatService] Error fetching messages:', error);
      return { messages: [], hasMore: false };
    }

    const hasMore = data.length > limit;
    const messages = data.slice(0, limit).map(mapMessage);

    // Return dalam urutan kronologis
    return { messages: messages.reverse(), hasMore };
  } catch (err) {
    console.error('[ChatService] Exception fetching messages:', err);
    return { messages: [], hasMore: false };
  }
}

/** Tandai pesan sebagai sudah dibaca */
export async function markMessagesAsRead(
  sb: SupabaseClient,
  conversationId: string,
  readBy: ChatSenderType,
  readerId?: string,
  readerName?: string
): Promise<boolean> {
  try {
    const senderTypeToMark = readBy === 'admin' ? 'customer' : 'admin';
    
    const { error } = await sb
      .from('chat_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('sender_type', senderTypeToMark)
      .eq('is_read', false);

    if (error) {
      console.error('[ChatService] Error marking messages as read:', error);
      return false;
    }

    // Log activity — fire-and-forget
    logActivity(sb, {
      conversationId,
      actorType: readBy,
      actorId: readerId,
      actorName: readerName || (readBy === 'admin' ? 'Admin' : 'Customer'),
      action: 'message_read',
      details: { markedReadFor: senderTypeToMark }
    }).catch(err => console.error('[ChatService] logActivity error:', err));

    return true;
  } catch (err) {
    console.error('[ChatService] Exception marking messages as read:', err);
    return false;
  }
}

// =============================================================================
// TYPING INDICATORS
// =============================================================================

/** Set typing indicator untuk user dalam percakapan */
export async function setTypingIndicator(
  sb: SupabaseClient,
  data: {
    conversationId: string;
    userId?: string;
    userType: ChatSenderType;
    userName?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_typing_indicators')
      .upsert({
        conversation_id: data.conversationId,
        user_id: data.userId,
        user_type: data.userType,
        user_name: data.userName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id,user_id,user_type'
      });

    if (error) {
      console.error('[ChatService] Error setting typing indicator:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception setting typing indicator:', err);
    return false;
  }
}

/** Hapus typing indicator */
export async function removeTypingIndicator(
  sb: SupabaseClient,
  data: {
    conversationId: string;
    userId?: string;
    userType: ChatSenderType;
  }
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_typing_indicators')
      .delete()
      .match({
        conversation_id: data.conversationId,
        user_id: data.userId,
        user_type: data.userType
      });

    if (error) {
      console.error('[ChatService] Error removing typing indicator:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception removing typing indicator:', err);
    return false;
  }
}

/** Ambil typing indicators untuk percakapan (10 detik terakhir) */
export async function getTypingIndicators(
  sb: SupabaseClient,
  conversationId: string
): Promise<any[]> {
  try {
    const { data, error } = await sb
      .from('chat_typing_indicators')
      .select('id, conversation_id, user_id, user_type, user_name, updated_at, created_at')
      .eq('conversation_id', conversationId)
      .gte('updated_at', new Date(Date.now() - 10000).toISOString());

    if (error) {
      console.error('[ChatService] Error getting typing indicators:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[ChatService] Exception getting typing indicators:', err);
    return [];
  }
}
