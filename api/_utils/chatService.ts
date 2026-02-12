/**
 * Chat Service (Backend) — Barrel Re-export
 *
 * File ini menjadi barrel yang me-re-export semua fungsi dari sub-modules di ./chat/.
 * Import pattern `import * as chatService from './_utils/chatService'` tetap berfungsi.
 *
 * Sub-modules:
 * - chat/chatMappers.ts       — Data mappers + logActivity (shared)
 * - chat/conversationService.ts — Conversation CRUD
 * - chat/messageService.ts     — Messages + typing indicators
 * - chat/participantService.ts  — Admin participants + rating
 * - chat/statsService.ts        — Chat statistics
 * - chat/cannedResponseService.ts — Canned responses CRUD
 */

export {
  // Shared: Activity log
  logActivity,
  getActivityLogs,

  // Conversations
  createConversation,
  getConversation,
  listConversations,
  updateConversationStatus,
  assignConversation,

  // Messages & typing
  sendMessage,
  getMessages,
  markMessagesAsRead,
  setTypingIndicator,
  removeTypingIndicator,
  getTypingIndicators,

  // Admin participants & rating
  addAdminParticipant,
  removeAdminParticipant,
  getAdminParticipants,
  submitRating,

  // Statistics
  getChatStatistics,

  // Canned responses
  getCannedResponses,
  getCannedResponseByShortcut,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  incrementCannedResponseUsage
} from './chat/index.js';
