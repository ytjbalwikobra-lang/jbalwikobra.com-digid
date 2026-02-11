/**
 * Tipe Sistem Live Chat
 * 
 * Definisi tipe untuk sistem chat realtime antara pelanggan dan admin
 */

// Status percakapan
export type ChatConversationStatus = 'open' | 'assigned' | 'resolved' | 'closed';

// Topik percakapan chat
export type ChatTopic = 'pembelian_rental' | 'jual_akun' | 'lainnya';

// Tipe pesan
export type ChatMessageType = 'text' | 'image' | 'file' | 'system';

// Tipe pengirim
export type ChatSenderType = 'customer' | 'admin' | 'system';

// Peran partisipan admin
export type ChatAdminRole = 'primary' | 'participant' | 'observer';

// Aksi log aktivitas
export type ChatActivityAction =
  | 'conversation_started'
  | 'conversation_assigned'
  | 'conversation_reassigned'
  | 'conversation_resolved'
  | 'conversation_closed'
  | 'conversation_reopened'
  | 'message_sent'
  | 'message_read'
  | 'admin_joined'
  | 'admin_left'
  | 'file_uploaded'
  | 'rating_submitted';

/**
 * Percakapan Chat
 */
export interface ChatConversation {
  id: string;
  
  // Info pelanggan
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  userId?: string;
  
  // Status
  status: ChatConversationStatus;
  subject?: string;
  topic?: ChatTopic;
  gameTitle?: string;
  
  // Penugasan
  assignedAdminId?: string;
  assignedAdmin?: ChatUser; // Diisi otomatis
  
  // Entitas terkait
  orderId?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Waktu
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Field yang dihitung/diisi
  messages?: ChatMessage[];
  participants?: ChatAdminParticipant[];
  unreadCount?: number;
  lastMessage?: ChatMessage;
}

/**
 * Pesan Chat
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  
  // Pengirim
  senderType: ChatSenderType;
  senderId?: string;
  senderName: string;
  
  // Konten
  message: string;
  messageType: ChatMessageType;
  
  // Lampiran (opsional)
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  
  // Status baca
  isRead: boolean;
  readAt?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Waktu
  createdAt: string;
}

/**
 * Partisipan Admin Chat
 */
export interface ChatAdminParticipant {
  id: string;
  conversationId: string;
  adminId: string;
  
  // Status
  role: ChatAdminRole;
  isActive: boolean;
  
  // Waktu
  joinedAt: string;
  leftAt?: string;
  
  // Info admin yang diisi otomatis
  admin?: ChatUser;
}

/**
 * Log Aktivitas Chat
 */
export interface ChatActivityLog {
  id: string;
  
  // Entitas terkait
  conversationId?: string;
  messageId?: string;
  
  // Aktor pelaku
  actorType: ChatSenderType;
  actorId?: string;
  actorName?: string;
  
  // Aksi
  action: ChatActivityAction;
  details?: Record<string, unknown>;
  
  // Info keamanan
  ipAddress?: string;
  userAgent?: string;
  
  // Waktu
  createdAt: string;
}

/**
 * Rating Chat
 */
export interface ChatRating {
  id: string;
  conversationId: string;
  rating: number; // 1-5
  feedback?: string;
  ratedAdminId?: string;
  createdAt: string;
}

/**
 * User sederhana untuk konteks chat
 */
export interface ChatUser {
  id: string;
  name?: string;
  email?: string;
  isAdmin: boolean;
}

// =============================================================================
// TIPE REQUEST/RESPONSE API
// =============================================================================

/**
 * Request mulai percakapan baru
 */
export interface StartChatRequest {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  subject?: string;
  topic?: ChatTopic;
  gameTitle?: string;
  initialMessage?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request kirim pesan
 */
export interface SendMessageRequest {
  conversationId: string;
  message: string;
  messageType?: ChatMessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

/**
 * Request tugaskan percakapan
 */
export interface AssignConversationRequest {
  conversationId: string;
  adminId: string;
}

/**
 * Request perbarui status percakapan
 * Digunakan untuk menyelesaikan/menutup percakapan
 */
export interface UpdateConversationStatusRequest {
  conversationId: string;
  status: ChatConversationStatus;
}

/**
 * Request admin bergabung ke percakapan
 */
export interface JoinConversationRequest {
  conversationId: string;
  role?: ChatAdminRole;
}

/**
 * Request kirim rating
 */
export interface SubmitRatingRequest {
  conversationId: string;
  rating: number;
  feedback?: string;
}

/**
 * Request daftar percakapan
 */
export interface ListConversationsRequest {
  status?: ChatConversationStatus | ChatConversationStatus[];
  assignedToMe?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Response daftar percakapan
 */
export interface ListConversationsResponse {
  conversations: ChatConversation[];
  total: number;
  hasMore: boolean;
}

/**
 * Request ambil pesan
 */
export interface GetMessagesRequest {
  conversationId: string;
  limit?: number;
  before?: string; // Kursor untuk paginasi
}

/**
 * Response ambil pesan
 */
export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

/**
 * Statistik chat untuk dashboard admin
 */
export interface ChatStatistics {
  totalConversations: number;
  openConversations: number;
  assignedConversations: number;
  resolvedConversations: number;
  averageResponseTime?: number; // dalam detik
  averageRating?: number;
  ratingsCount: number;
}

// =============================================================================
// PENINGKATAN: Indikator Mengetik & Template Respon Cepat
// =============================================================================

/**
 * Indikator Mengetik
 * Menampilkan siapa yang sedang mengetik dalam percakapan
 */
export interface ChatTypingIndicator {
  id: string;
  conversationId: string;
  userId?: string;
  userType: ChatSenderType;
  userName?: string;
  startedAt: string;
  updatedAt: string;
}

/**
 * Kategori Template Respon Cepat
 */
export type CannedResponseCategory = 
  | 'greeting' 
  | 'closing' 
  | 'faq' 
  | 'technical' 
  | 'status' 
  | 'followup'
  | 'other';

/**
 * Template Respon Cepat
 * Template pesan standar untuk respon cepat admin
 */
export interface ChatCannedResponse {
  id: string;
  title: string;
  message: string;
  category?: CannedResponseCategory;
  shortcut?: string; // contoh: '/hello', '/thanks'
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request buat/perbarui template respon cepat
 */
export interface CannedResponseRequest {
  title: string;
  message: string;
  category?: CannedResponseCategory;
  shortcut?: string;
  isActive?: boolean;
  sortOrder?: number;
}

