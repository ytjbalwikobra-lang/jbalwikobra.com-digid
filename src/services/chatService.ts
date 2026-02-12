/**
 * Chat Service (Frontend)
 * 
 * Barrel re-export untuk semua modul chat service.
 * File ini menjaga backward-compatibility import yang sudah ada.
 * 
 * Modul:
 * - chatApiHelper.ts      : Fungsi bantuan API
 * - chatCustomerService.ts : Fungsi pelanggan
 * - chatAdminService.ts    : Fungsi admin
 * - chatRealtimeService.ts : Langganan realtime & indikator mengetik
 */

// Fungsi pelanggan
export {
  startConversation,
  sendCustomerMessage,
  getCustomerMessages,
  submitRating,
  uploadChatAttachment,
  getConversationDetails,
  getCustomerConversations
} from './chatCustomerService';

export type { CustomerConversationSummary } from './chatCustomerService';

// Fungsi admin
export {
  adminListConversations,
  adminGetConversation,
  adminSendMessage,
  adminGetMessages,
  adminAssignConversation,
  adminUpdateStatus,
  adminJoinConversation,
  adminLeaveConversation,
  adminGetParticipants,
  adminGetActivityLogs,
  adminGetChatStatistics,
  adminMarkRead,
  adminGetCannedResponses,
  adminCreateCannedResponse,
  adminUpdateCannedResponse,
  adminDeleteCannedResponse,
  incrementCannedResponseUsage,
  getChatSettings,
  adminUpdateChatSettings,
  isWithinBusinessHours
} from './chatAdminService';

// Langganan realtime & indikator mengetik
export {
  subscribeToMessages,
  subscribeToAllMessages,
  subscribeToConversations,
  subscribeToTypingIndicators,
  adminSetTyping,
  adminStopTyping,
  customerSetTyping,
  customerStopTyping
} from './chatRealtimeService';
