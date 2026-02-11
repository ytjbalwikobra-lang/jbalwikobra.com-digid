/**
 * Live Chat System Types
 * 
 * Types for the real-time chat system between customers and admins
 */

// Conversation status
export type ChatConversationStatus = 'open' | 'assigned' | 'resolved' | 'closed';

// Message types
export type ChatMessageType = 'text' | 'image' | 'file' | 'system';

// Sender types
export type ChatSenderType = 'customer' | 'admin' | 'system';

// Admin participant roles
export type ChatAdminRole = 'primary' | 'participant' | 'observer';

// Activity log actions
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
 * Chat Conversation
 */
export interface ChatConversation {
  id: string;
  
  // Customer info
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  userId?: string;
  
  // State
  status: ChatConversationStatus;
  subject?: string;
  
  // Assignment
  assignedAdminId?: string;
  assignedAdmin?: ChatUser; // Populated
  
  // Related entities
  orderId?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Computed/populated fields
  messages?: ChatMessage[];
  participants?: ChatAdminParticipant[];
  unreadCount?: number;
  lastMessage?: ChatMessage;
}

/**
 * Chat Message
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  
  // Sender
  senderType: ChatSenderType;
  senderId?: string;
  senderName: string;
  
  // Content
  message: string;
  messageType: ChatMessageType;
  
  // Attachment (optional)
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  
  // Read status
  isRead: boolean;
  readAt?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamp
  createdAt: string;
}

/**
 * Chat Admin Participant
 */
export interface ChatAdminParticipant {
  id: string;
  conversationId: string;
  adminId: string;
  
  // State
  role: ChatAdminRole;
  isActive: boolean;
  
  // Timestamps
  joinedAt: string;
  leftAt?: string;
  
  // Populated admin info
  admin?: ChatUser;
}

/**
 * Chat Activity Log
 */
export interface ChatActivityLog {
  id: string;
  
  // Related entities
  conversationId?: string;
  messageId?: string;
  
  // Actor
  actorType: ChatSenderType;
  actorId?: string;
  actorName?: string;
  
  // Action
  action: ChatActivityAction;
  details?: Record<string, unknown>;
  
  // Security info
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  createdAt: string;
}

/**
 * Chat Rating
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
 * Simplified User for chat context
 */
export interface ChatUser {
  id: string;
  name?: string;
  email?: string;
  isAdmin: boolean;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Start new conversation request
 */
export interface StartChatRequest {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  subject?: string;
  initialMessage?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send message request
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
 * Assign conversation request
 */
export interface AssignConversationRequest {
  conversationId: string;
  adminId: string;
}

/**
 * Update conversation status request
 * Used for resolving/closing conversations
 */
export interface UpdateConversationStatusRequest {
  conversationId: string;
  status: ChatConversationStatus;
}

/**
 * Admin join conversation request
 */
export interface JoinConversationRequest {
  conversationId: string;
  role?: ChatAdminRole;
}

/**
 * Submit rating request
 */
export interface SubmitRatingRequest {
  conversationId: string;
  rating: number;
  feedback?: string;
}

/**
 * List conversations request
 */
export interface ListConversationsRequest {
  status?: ChatConversationStatus | ChatConversationStatus[];
  assignedToMe?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * List conversations response
 */
export interface ListConversationsResponse {
  conversations: ChatConversation[];
  total: number;
  hasMore: boolean;
}

/**
 * Get messages request
 */
export interface GetMessagesRequest {
  conversationId: string;
  limit?: number;
  before?: string; // Cursor for pagination
}

/**
 * Get messages response
 */
export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

/**
 * Chat statistics for admin dashboard
 */
export interface ChatStatistics {
  totalConversations: number;
  openConversations: number;
  assignedConversations: number;
  resolvedConversations: number;
  averageResponseTime?: number; // in seconds
  averageRating?: number;
  ratingsCount: number;
}

// =============================================================================
// ENHANCEMENTS: Typing Indicators & Canned Responses
// =============================================================================

/**
 * Typing Indicator
 * Shows who is currently typing in a conversation
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
 * Canned Response Category
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
 * Canned Response (Template Message)
 * Pre-defined message templates for admin quick responses
 */
export interface ChatCannedResponse {
  id: string;
  title: string;
  message: string;
  category?: CannedResponseCategory;
  shortcut?: string; // e.g., '/hello', '/thanks'
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create/Update Canned Response Request
 */
export interface CannedResponseRequest {
  title: string;
  message: string;
  category?: CannedResponseCategory;
  shortcut?: string;
  isActive?: boolean;
  sortOrder?: number;
}

