/**
 * Chat Admin Service
 * 
 * Fungsi sisi admin untuk mengelola percakapan live chat.
 * Menangani daftar percakapan, kirim pesan, status, dan partisipan.
 */

import { chatApiCall } from './chatApiHelper';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog,
  ChatStatistics,
  ChatCannedResponse,
  CannedResponseRequest,
  ListConversationsResponse,
  GetMessagesResponse,
  ChatConversationStatus
} from '../types/chat';

// =============================================================================
// FUNGSI PERCAKAPAN ADMIN
// =============================================================================

/**
 * Daftar percakapan (admin)
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
  const result = await chatApiCall<ListConversationsResponse>(
    'admin-list-conversations',
    'GET',
    options
  );

  return result.data || { conversations: [], total: 0, hasMore: false };
}

/**
 * Ambil detail percakapan beserta pesan dan partisipan (admin)
 */
export async function adminGetConversation(
  conversationId: string
): Promise<(ChatConversation & { participants?: ChatAdminParticipant[]; messages?: ChatMessage[] }) | null> {
  const result = await chatApiCall<ChatConversation & { participants?: ChatAdminParticipant[]; messages?: ChatMessage[] }>(
    'admin-get-conversation',
    'GET',
    { conversationId }
  );

  return result.data || null;
}

/**
 * Kirim pesan sebagai admin
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
  const result = await chatApiCall<{ success: boolean; message: ChatMessage }>(
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
 * Ambil pesan untuk percakapan (admin)
 */
export async function adminGetMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<GetMessagesResponse> {
  const result = await chatApiCall<GetMessagesResponse>(
    'admin-get-messages',
    'GET',
    { conversationId, ...options }
  );

  return result.data || { messages: [], hasMore: false };
}

/**
 * Tugaskan percakapan ke admin
 */
export async function adminAssignConversation(
  conversationId: string,
  adminId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await chatApiCall<{ success: boolean }>(
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
 * Perbarui status percakapan
 */
export async function adminUpdateStatus(
  conversationId: string,
  status: ChatConversationStatus
): Promise<{ success: boolean; error: string | null }> {
  const result = await chatApiCall<{ success: boolean }>(
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
 * Bergabung ke percakapan sebagai admin
 */
export async function adminJoinConversation(
  conversationId: string,
  role?: 'participant' | 'observer'
): Promise<{ success: boolean; error: string | null }> {
  const result = await chatApiCall<{ success: boolean }>(
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
 * Keluar dari percakapan
 */
export async function adminLeaveConversation(
  conversationId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await chatApiCall<{ success: boolean }>(
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
 * Ambil daftar partisipan untuk percakapan
 */
export async function adminGetParticipants(
  conversationId: string,
  includeInactive?: boolean
): Promise<ChatAdminParticipant[]> {
  const result = await chatApiCall<{ participants: ChatAdminParticipant[] }>(
    'admin-get-participants',
    'GET',
    { conversationId, includeInactive }
  );

  return result.data?.participants || [];
}

/**
 * Ambil log aktivitas untuk percakapan
 */
export async function adminGetActivityLogs(
  conversationId: string,
  limit?: number
): Promise<ChatActivityLog[]> {
  const result = await chatApiCall<{ logs: ChatActivityLog[] }>(
    'admin-get-activity-logs',
    'GET',
    { conversationId, limit }
  );

  return result.data?.logs || [];
}

/**
 * Ambil statistik chat untuk dashboard
 */
export async function adminGetChatStatistics(): Promise<ChatStatistics | null> {
  const result = await chatApiCall<ChatStatistics>('admin-chat-statistics', 'GET');
  return result.data || null;
}

/**
 * Tandai pesan sebagai dibaca
 */
export async function adminMarkRead(
  conversationId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await chatApiCall<{ success: boolean }>(
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
// TEMPLATE RESPON CEPAT
// =============================================================================

/**
 * Ambil semua template respon cepat (admin)
 */
export async function adminGetCannedResponses(category?: string): Promise<ChatCannedResponse[]> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  const result = await chatApiCall<{ responses: ChatCannedResponse[] }>('admin-get-canned-responses', 'GET', params);
  // Backend mengembalikan { responses: [...] }, perlu di-unwrap
  const data = result.data;
  if (data && Array.isArray((data as any).responses)) {
    return (data as any).responses;
  }
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * Buat template respon cepat baru (admin)
 */
export async function adminCreateCannedResponse(request: CannedResponseRequest): Promise<{ data: ChatCannedResponse | null; error: string | null }> {
  return chatApiCall<ChatCannedResponse>('admin-create-canned-response', 'POST', undefined, request);
}

/**
 * Perbarui template respon cepat (admin)
 */
export async function adminUpdateCannedResponse(id: string, request: Partial<CannedResponseRequest>): Promise<{ data: ChatCannedResponse | null; error: string | null }> {
  return chatApiCall<ChatCannedResponse>('admin-update-canned-response', 'POST', undefined, { id, ...request });
}

/**
 * Hapus template respon cepat (admin)
 */
export async function adminDeleteCannedResponse(id: string): Promise<{ data: any; error: string | null }> {
  return chatApiCall('admin-delete-canned-response', 'POST', undefined, { id });
}
