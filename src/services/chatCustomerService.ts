/**
 * Chat Customer Service
 * 
 * Fungsi sisi pelanggan untuk fitur live chat.
 * Menangani mulai percakapan, kirim pesan, dan rating.
 */

import { chatApiCall } from './chatApiHelper';
import type {
  ChatConversation,
  ChatMessage,
  ChatRating,
  StartChatRequest,
  GetMessagesResponse,
  SubmitRatingRequest
} from '../types/chat';

/**
 * Mulai percakapan chat baru
 */
export async function startConversation(
  request: StartChatRequest
): Promise<{ conversation: ChatConversation | null; error: string | null }> {
  const result = await chatApiCall<{ success: boolean; conversation: ChatConversation }>(
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
 * Kirim pesan sebagai pelanggan
 */
export async function sendCustomerMessage(
  conversationId: string,
  message: string,
  customerEmail?: string,
  senderName?: string,
  options?: {
    messageType?: 'text' | 'image' | 'file';
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
  }
): Promise<{ message: ChatMessage | null; error: string | null }> {
  const result = await chatApiCall<{ success: boolean; message: ChatMessage }>(
    'send-message',
    'POST',
    undefined,
    { conversationId, message, customerEmail, senderName, ...options }
  );

  if (result.error || !result.data?.message) {
    return { message: null, error: result.error || 'Failed to send message' };
  }

  return { message: result.data.message, error: null };
}

/**
 * Upload lampiran gambar ke Supabase Storage via backend
 */
export async function uploadChatAttachment(
  conversationId: string,
  file: File
): Promise<{ url: string | null; fileName: string | null; mimeType: string | null; error: string | null }> {
  // Konversi file ke base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Hapus prefix data:image/xxx;base64,
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const result = await chatApiCall<{ success: boolean; url: string; fileName: string; mimeType: string }>(
    'upload-attachment',
    'POST',
    undefined,
    { conversationId, base64Data, fileName: file.name, mimeType: file.type }
  );

  if (result.error || !result.data?.url) {
    return { url: null, fileName: null, mimeType: null, error: result.error || 'Gagal upload file' };
  }

  return { url: result.data.url, fileName: result.data.fileName, mimeType: result.data.mimeType, error: null };
}

/**
 * Ambil pesan untuk percakapan (tampilan pelanggan)
 */
export async function getCustomerMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<GetMessagesResponse> {
  const result = await chatApiCall<GetMessagesResponse>(
    'get-messages',
    'GET',
    { conversationId, ...options }
  );

  return result.data || { messages: [], hasMore: false };
}

/**
 * Kirim rating untuk percakapan yang sudah selesai
 */
export async function submitRating(
  request: SubmitRatingRequest
): Promise<{ rating: ChatRating | null; error: string | null }> {
  const result = await chatApiCall<{ success: boolean; rating: ChatRating }>(
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
