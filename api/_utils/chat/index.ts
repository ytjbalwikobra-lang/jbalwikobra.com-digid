/**
 * chat/index.ts
 * Barrel export — re-export semua fungsi dari sub-modules.
 * Menjaga backward compatibility dengan `import * as chatService from './_utils/chatService'`
 */

// Shared mappers & activity log
export { logActivity, getActivityLogs } from './chatMappers.js';

// Conversation CRUD
export {
  createConversation,
  getConversation,
  listConversations,
  updateConversationStatus,
  assignConversation
} from './conversationService.js';

// Messages & typing indicators
export {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  setTypingIndicator,
  removeTypingIndicator,
  getTypingIndicators
} from './messageService.js';

// Admin participants & rating
export {
  addAdminParticipant,
  removeAdminParticipant,
  getAdminParticipants,
  submitRating
} from './participantService.js';

// Statistics
export { getChatStatistics } from './statsService.js';

// Canned responses
export {
  getCannedResponses,
  getCannedResponseByShortcut,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  incrementCannedResponseUsage
} from './cannedResponseService.js';
