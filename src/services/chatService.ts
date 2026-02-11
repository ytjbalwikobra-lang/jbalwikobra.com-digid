/**
 * Chat Service (Frontend)
 * 
 * Client-side service for live chat functionality.
 * Handles API calls and realtime subscriptions.
 */

import { supabase } from './supabase';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog,
  ChatRating,
  ChatStatistics,
  ChatTypingIndicator,
  ChatCannedResponse,
  CannedResponseRequest,
  StartChatRequest,
  ListConversationsResponse,
  GetMessagesResponse,
  SubmitRatingRequest,
  ChatConversationStatus
} from '../types/chat';

const API_BASE = '/api/chat';

// =============================================================================
// API HELPERS
// =============================================================================

async function apiCall<T>(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  params?: Record<string, any>,
  body?: any
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    
    if (method === 'GET' && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add auth token if available (for admin endpoints)
    const session = await supabase?.auth.getSession();
    if (session?.data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error || 'Request failed' };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('[ChatService] API error:', error);
    return { data: null, error: error.message || 'Network error' };
  }
}

// =============================================================================
// CUSTOMER FUNCTIONS
// =============================================================================

/**
 * Start a new chat conversation
 */
export async function startConversation(
  request: StartChatRequest
): Promise<{ conversation: ChatConversation | null; error: string | null }> {
  const result = await apiCall<{ success: boolean; conversation: ChatConversation }>(
    'start-conversation',
    'POST',
    undefined,
    request
  );

  if (result.error || !result.data?.conversation) {
    return { conversation: null, error: result.error || 'Failed to start conversation' };
  }

  return { conversation: result.data.conversation, error: null };
}

/**
 * Send a message as customer
 */
export async function sendCustomerMessage(
  conversationId: string,
  message: string,
  customerEmail?: string,
  senderName?: string
): Promise<{ message: ChatMessage | null; error: string | null }> {
  const result = await apiCall<{ success: boolean; message: ChatMessage }>(
    'send-message',
    'POST',
    undefined,
    { conversationId, message, customerEmail, senderName }
  );

  if (result.error || !result.data?.message) {
    return { message: null, error: result.error || 'Failed to send message' };
  }

  return { message: result.data.message, error: null };
}

/**
 * Get messages for a conversation (customer view)
 */
export async function getCustomerMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<GetMessagesResponse> {
  const result = await apiCall<GetMessagesResponse>(
    'get-messages',
    'GET',
    { conversationId, ...options }
  );

  return result.data || { messages: [], hasMore: false };
}

/**
 * Submit a rating for a completed conversation
 */
export async function submitRating(
  request: SubmitRatingRequest
): Promise<{ rating: ChatRating | null; error: string | null }> {
  const result = await apiCall<{ success: boolean; rating: ChatRating }>(
    'submit-rating',
    'POST',
    undefined,
    request
  );

  if (result.error || !result.data?.rating) {
    return { rating: null, error: result.error || 'Failed to submit rating' };
  }

  return { rating: result.data.rating, error: null };
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * List conversations (admin)
 */
export async function adminListConversations(
  options?: {
    status?: ChatConversationStatus | ChatConversationStatus[];
    assignedToMe?: boolean;
    unassigned?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<ListConversationsResponse> {
  const result = await apiCall<ListConversationsResponse>(
    'admin-list-conversations',
    'GET',
    options
  );

  return result.data || { conversations: [], total: 0, hasMore: false };
}

/**
 * Get conversation details with messages and participants (admin)
 */
export async function adminGetConversation(
  conversationId: string
): Promise<(ChatConversation & { participants?: ChatAdminParticipant[]; messages?: ChatMessage[] }) | null> {
  const result = await apiCall<ChatConversation & { participants?: ChatAdminParticipant[]; messages?: ChatMessage[] }>(
    'admin-get-conversation',
    'GET',
    { conversationId }
  );

  return result.data || null;
}

/**
 * Send a message as admin
 */
export async function adminSendMessage(
  conversationId: string,
  message: string,
  options?: {
    messageType?: 'text' | 'image' | 'file';
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
  }
): Promise<{ message: ChatMessage | null; error: string | null }> {
  const result = await apiCall<{ success: boolean; message: ChatMessage }>(
    'admin-send-message',
    'POST',
    undefined,
    { conversationId, message, ...options }
  );

  if (result.error || !result.data?.message) {
    return { message: null, error: result.error || 'Failed to send message' };
  }

  return { message: result.data.message, error: null };
}

/**
 * Get messages for a conversation (admin)
 */
export async function adminGetMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<GetMessagesResponse> {
  const result = await apiCall<GetMessagesResponse>(
    'admin-get-messages',
    'GET',
    { conversationId, ...options }
  );

  return result.data || { messages: [], hasMore: false };
}

/**
 * Assign conversation to admin
 */
export async function adminAssignConversation(
  conversationId: string,
  adminId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await apiCall<{ success: boolean }>(
    'admin-assign-conversation',
    'POST',
    undefined,
    { conversationId, adminId }
  );

  return {
    success: result.data?.success || false,
    error: result.error
  };
}

/**
 * Update conversation status
 */
export async function adminUpdateStatus(
  conversationId: string,
  status: ChatConversationStatus
): Promise<{ success: boolean; error: string | null }> {
  const result = await apiCall<{ success: boolean }>(
    'admin-update-status',
    'POST',
    undefined,
    { conversationId, status }
  );

  return {
    success: result.data?.success || false,
    error: result.error
  };
}

/**
 * Join a conversation as admin
 */
export async function adminJoinConversation(
  conversationId: string,
  role?: 'participant' | 'observer'
): Promise<{ success: boolean; error: string | null }> {
  const result = await apiCall<{ success: boolean }>(
    'admin-join-conversation',
    'POST',
    undefined,
    { conversationId, role }
  );

  return {
    success: result.data?.success || false,
    error: result.error
  };
}

/**
 * Leave a conversation
 */
export async function adminLeaveConversation(
  conversationId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await apiCall<{ success: boolean }>(
    'admin-leave-conversation',
    'POST',
    undefined,
    { conversationId }
  );

  return {
    success: result.data?.success || false,
    error: result.error
  };
}

/**
 * Get participants for a conversation
 */
export async function adminGetParticipants(
  conversationId: string,
  includeInactive?: boolean
): Promise<ChatAdminParticipant[]> {
  const result = await apiCall<{ participants: ChatAdminParticipant[] }>(
    'admin-get-participants',
    'GET',
    { conversationId, includeInactive }
  );

  return result.data?.participants || [];
}

/**
 * Get activity logs for a conversation
 */
export async function adminGetActivityLogs(
  conversationId: string,
  limit?: number
): Promise<ChatActivityLog[]> {
  const result = await apiCall<{ logs: ChatActivityLog[] }>(
    'admin-get-activity-logs',
    'GET',
    { conversationId, limit }
  );

  return result.data?.logs || [];
}

/**
 * Get chat statistics for dashboard
 */
export async function adminGetChatStatistics(): Promise<ChatStatistics | null> {
  const result = await apiCall<ChatStatistics>('admin-chat-statistics', 'GET');
  return result.data || null;
}

/**
 * Mark messages as read
 */
export async function adminMarkRead(
  conversationId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await apiCall<{ success: boolean }>(
    'admin-mark-read',
    'POST',
    undefined,
    { conversationId }
  );

  return {
    success: result.data?.success || false,
    error: result.error
  };
}

// =============================================================================
// REALTIME SUBSCRIPTIONS
// =============================================================================

type MessageCallback = (message: ChatMessage) => void;
type ConversationCallback = (conversation: ChatConversation) => void;

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: MessageCallback
): { unsubscribe: () => void } {
  if (!supabase) {
    console.warn('[ChatService] Supabase not available for realtime');
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
 * Subscribe to conversation updates (status changes, new messages)
 */
export function subscribeToConversations(
  callback: ConversationCallback,
  filter?: { status?: ChatConversationStatus }
): { unsubscribe: () => void } {
  if (!supabase) {
    console.warn('[ChatService] Supabase not available for realtime');
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
// TYPING INDICATORS
// =============================================================================

type TypingCallback = (indicators: ChatTypingIndicator[]) => void;

/**
 * Send typing indicator (admin)
 */
export async function adminSetTyping(conversationId: string): Promise<void> {
  await apiCall('set-typing', 'POST', undefined, { conversationId });
}

/**
 * Stop typing indicator (admin)
 */
export async function adminStopTyping(conversationId: string): Promise<void> {
  await apiCall('stop-typing', 'POST', undefined, { conversationId });
}

/**
 * Send typing indicator (customer - direct Supabase for speed)
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
 * Stop typing indicator (customer)
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
 * Subscribe to typing indicators for a conversation
 */
export function subscribeToTypingIndicators(
  conversationId: string,
  callback: TypingCallback
): { unsubscribe: () => void } {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

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
      async () => {
        // Fetch current typing indicators on any change
        const { data } = await supabase!
          .from('chat_typing_indicators')
          .select('*')
          .eq('conversation_id', conversationId)
          .gte('updated_at', new Date(Date.now() - 10000).toISOString());
        
        const indicators: ChatTypingIndicator[] = (data || []).map((row: any) => ({
          id: row.id,
          conversationId: row.conversation_id,
          userId: row.user_id,
          userType: row.user_type,
          userName: row.user_name,
          startedAt: row.started_at || row.created_at,
          updatedAt: row.updated_at
        }));
        
        callback(indicators);
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
// CANNED RESPONSES
// =============================================================================

/**
 * Get all canned responses (admin)
 */
export async function adminGetCannedResponses(category?: string): Promise<{ data: ChatCannedResponse[] | null; error: string | null }> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  return apiCall<ChatCannedResponse[]>('admin-get-canned-responses', 'GET', params);
}

/**
 * Create a canned response (admin)
 */
export async function adminCreateCannedResponse(request: CannedResponseRequest): Promise<{ data: ChatCannedResponse | null; error: string | null }> {
  return apiCall<ChatCannedResponse>('admin-create-canned-response', 'POST', undefined, request);
}

/**
 * Update a canned response (admin)
 */
export async function adminUpdateCannedResponse(id: string, request: Partial<CannedResponseRequest>): Promise<{ data: ChatCannedResponse | null; error: string | null }> {
  return apiCall<ChatCannedResponse>('admin-update-canned-response', 'POST', undefined, { id, ...request });
}

/**
 * Delete a canned response (admin)
 */
export async function adminDeleteCannedResponse(id: string): Promise<{ data: any; error: string | null }> {
  return apiCall('admin-delete-canned-response', 'POST', undefined, { id });
}

// =============================================================================
// DATA MAPPERS (for realtime payloads)
// =============================================================================

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

function mapConversationFromRealtime(row: any): ChatConversation {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    userId: row.user_id,
    status: row.status,
    subject: row.subject,
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
