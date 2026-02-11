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
  getConversationDetails
} from './chatCustomerService';

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
  adminDeleteCannedResponse
} from './chatAdminService';

// Langganan realtime & indikator mengetik
export {
  subscribeToMessages,
  subscribeToConversations,
  subscribeToTypingIndicators,
  adminSetTyping,
  adminStopTyping,
  customerSetTyping,
  customerStopTyping
} from './chatRealtimeService';
