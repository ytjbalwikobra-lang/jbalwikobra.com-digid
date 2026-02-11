import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders, CacheStrategies } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth } from './_middleware/authMiddleware.js';
import * as chatService from './_utils/chatService.js';

// Clean environment variables
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\r\n\\]/g, '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();

// Use service role for admin operations, anon for customer operations
const supabaseAdminKey = supabaseServiceKey || supabaseAnonKey;
const supabaseAdmin = supabaseUrl && supabaseAdminKey ? createClient(supabaseUrl, supabaseAdminKey) : null;
const supabaseAnon = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Rate limiting
const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT = 60;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    rateMap.set(key, { count: 1, ts: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function respond(res: VercelResponse, status: number, body: any) {
  res.setHeader('Content-Type', 'application/json');
  setCacheHeaders(res, CacheStrategies.NoCache); // No caching for chat
  res.status(status).send(JSON.stringify(body));
}

function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         (req.headers['x-real-ip'] as string) || 
         'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(res, req);
  if (handleCorsPreFlight(req, res)) return;

  // Rate limiting
  const ip = getClientIP(req);
  if (!rateLimit(ip)) {
    return respond(res, 429, { error: 'Too many requests' });
  }

  // Check Supabase
  if (!supabaseAdmin && !supabaseAnon) {
    return respond(res, 500, { error: 'Database not configured' });
  }

  const { action, conversationId, messageId } = req.query;

  try {
    switch (action) {
      // =========================================================================
      // CUSTOMER ENDPOINTS (no auth required)
      // =========================================================================
      
      case 'start-conversation':
        return await handleStartConversation(req, res);
      
      case 'send-message':
        return await handleSendMessage(req, res, false);
      
      case 'get-messages':
        return await handleGetMessages(req, res, false);
      
      case 'submit-rating':
        return await handleSubmitRating(req, res);

      // =========================================================================
      // ADMIN ENDPOINTS (auth required)
      // =========================================================================
      
      case 'admin-list-conversations':
        return await handleAdminListConversations(req, res);
      
      case 'admin-get-conversation':
        return await handleAdminGetConversation(req, res);
      
      case 'admin-send-message':
        return await handleSendMessage(req, res, true);
      
      case 'admin-get-messages':
        return await handleGetMessages(req, res, true);
      
      case 'admin-assign-conversation':
        return await handleAssignConversation(req, res);
      
      case 'admin-update-status':
        return await handleUpdateStatus(req, res);
      
      case 'admin-join-conversation':
        return await handleJoinConversation(req, res);
      
      case 'admin-leave-conversation':
        return await handleLeaveConversation(req, res);
      
      case 'admin-get-participants':
        return await handleGetParticipants(req, res);
      
      case 'admin-get-activity-logs':
        return await handleGetActivityLogs(req, res);
      
      case 'admin-chat-statistics':
        return await handleChatStatistics(req, res);
      
      case 'admin-mark-read':
        return await handleMarkRead(req, res);

      default:
        return respond(res, 400, { error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('[chat.ts] Handler error:', error);
    return respond(res, 500, { error: 'Internal server error' });
  }
}

// =============================================================================
// CUSTOMER HANDLERS
// =============================================================================

async function handleStartConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { customerEmail, customerName, customerPhone, subject, initialMessage, orderId, metadata } = req.body || {};

  if (!customerEmail && !customerPhone) {
    return respond(res, 400, { error: 'Email or phone required' });
  }

  const sb = supabaseAnon || supabaseAdmin;
  
  // Create conversation
  const conversation = await chatService.createConversation(sb, {
    customerEmail,
    customerName,
    customerPhone,
    subject,
    orderId,
    metadata
  });

  if (!conversation) {
    return respond(res, 500, { error: 'Failed to create conversation' });
  }

  // Send initial message if provided
  if (initialMessage) {
    await chatService.sendMessage(sb, {
      conversationId: conversation.id,
      senderType: 'customer',
      senderName: customerName || customerEmail || 'Customer',
      message: initialMessage
    });
  }

  return respond(res, 200, { success: true, conversation });
}

async function handleSendMessage(req: VercelRequest, res: VercelResponse, isAdmin: boolean) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  // Validate admin auth if admin endpoint
  let adminUser: any = null;
  if (isAdmin) {
    const authResult = await validateAdminAuth(req, supabaseAdmin);
    if (!authResult.valid) {
      return respond(res, 401, { error: authResult.error || 'Unauthorized' });
    }
    adminUser = authResult.user;
  }

  const { conversationId, message, messageType, attachmentUrl, attachmentName, attachmentType } = req.body || {};

  if (!conversationId || !message) {
    return respond(res, 400, { error: 'conversationId and message required' });
  }

  const sb = isAdmin ? supabaseAdmin : (supabaseAnon || supabaseAdmin);

  // For customers, verify they own the conversation or provide correct email
  if (!isAdmin) {
    const { customerEmail } = req.body || {};
    const conv = await chatService.getConversation(sb, conversationId);
    if (!conv || (customerEmail && conv.customerEmail !== customerEmail)) {
      return respond(res, 403, { error: 'Forbidden' });
    }
  }

  const senderType = isAdmin ? 'admin' : 'customer';
  const senderName = isAdmin 
    ? (adminUser?.name || adminUser?.email || 'Admin')
    : (req.body.senderName || req.body.customerName || 'Customer');

  const msg = await chatService.sendMessage(sb, {
    conversationId,
    senderType,
    senderId: isAdmin ? adminUser?.id : undefined,
    senderName,
    message,
    messageType,
    attachmentUrl,
    attachmentName,
    attachmentType
  });

  if (!msg) {
    return respond(res, 500, { error: 'Failed to send message' });
  }

  return respond(res, 200, { success: true, message: msg });
}

async function handleGetMessages(req: VercelRequest, res: VercelResponse, isAdmin: boolean) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  if (isAdmin) {
    const authResult = await validateAdminAuth(req, supabaseAdmin);
    if (!authResult.valid) {
      return respond(res, 401, { error: authResult.error || 'Unauthorized' });
    }
  }

  const { conversationId, limit, before } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const sb = isAdmin ? supabaseAdmin : (supabaseAnon || supabaseAdmin);

  const result = await chatService.getMessages(sb, conversationId as string, {
    limit: limit ? parseInt(limit as string, 10) : undefined,
    before: before as string
  });

  return respond(res, 200, result);
}

async function handleSubmitRating(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { conversationId, rating, feedback } = req.body || {};

  if (!conversationId || !rating || rating < 1 || rating > 5) {
    return respond(res, 400, { error: 'Valid conversationId and rating (1-5) required' });
  }

  const sb = supabaseAnon || supabaseAdmin;

  const result = await chatService.submitRating(sb, {
    conversationId,
    rating,
    feedback
  });

  if (!result) {
    return respond(res, 500, { error: 'Failed to submit rating' });
  }

  return respond(res, 200, { success: true, rating: result });
}

// =============================================================================
// ADMIN HANDLERS
// =============================================================================

async function handleAdminListConversations(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { status, assignedToMe, unassigned, limit, offset } = req.query;

  const result = await chatService.listConversations(supabaseAdmin, {
    status: status as any,
    assignedAdminId: assignedToMe === 'true' ? authResult.user?.id : undefined,
    unassigned: unassigned === 'true',
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined
  });

  return respond(res, 200, result);
}

async function handleAdminGetConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const conversation = await chatService.getConversation(supabaseAdmin, conversationId as string);

  if (!conversation) {
    return respond(res, 404, { error: 'Conversation not found' });
  }

  // Also fetch participants and recent messages
  const [participants, messagesResult] = await Promise.all([
    chatService.getAdminParticipants(supabaseAdmin, conversationId as string),
    chatService.getMessages(supabaseAdmin, conversationId as string, { limit: 50 })
  ]);

  return respond(res, 200, {
    ...conversation,
    participants,
    messages: messagesResult.messages
  });
}

async function handleAssignConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId, adminId } = req.body || {};

  if (!conversationId || !adminId) {
    return respond(res, 400, { error: 'conversationId and adminId required' });
  }

  const success = await chatService.assignConversation(
    supabaseAdmin,
    conversationId,
    adminId,
    authResult.user?.id,
    authResult.user?.name || authResult.user?.email
  );

  if (!success) {
    return respond(res, 500, { error: 'Failed to assign conversation' });
  }

  return respond(res, 200, { success: true });
}

async function handleUpdateStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId, status } = req.body || {};

  if (!conversationId || !status) {
    return respond(res, 400, { error: 'conversationId and status required' });
  }

  const validStatuses = ['open', 'assigned', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return respond(res, 400, { error: 'Invalid status' });
  }

  const success = await chatService.updateConversationStatus(
    supabaseAdmin,
    conversationId,
    status,
    authResult.user?.id,
    authResult.user?.name || authResult.user?.email
  );

  if (!success) {
    return respond(res, 500, { error: 'Failed to update status' });
  }

  return respond(res, 200, { success: true });
}

async function handleJoinConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId, role } = req.body || {};

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const success = await chatService.addAdminParticipant(
    supabaseAdmin,
    conversationId,
    authResult.user?.id,
    role || 'participant'
  );

  if (!success) {
    return respond(res, 500, { error: 'Failed to join conversation' });
  }

  return respond(res, 200, { success: true });
}

async function handleLeaveConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId } = req.body || {};

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const success = await chatService.removeAdminParticipant(
    supabaseAdmin,
    conversationId,
    authResult.user?.id
  );

  if (!success) {
    return respond(res, 500, { error: 'Failed to leave conversation' });
  }

  return respond(res, 200, { success: true });
}

async function handleGetParticipants(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId, includeInactive } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const participants = await chatService.getAdminParticipants(
    supabaseAdmin,
    conversationId as string,
    includeInactive !== 'true'
  );

  return respond(res, 200, { participants });
}

async function handleGetActivityLogs(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId, limit } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const logs = await chatService.getActivityLogs(
    supabaseAdmin,
    conversationId as string,
    limit ? parseInt(limit as string, 10) : undefined
  );

  return respond(res, 200, { logs });
}

async function handleChatStatistics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const stats = await chatService.getChatStatistics(supabaseAdmin);

  return respond(res, 200, stats);
}

async function handleMarkRead(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req, supabaseAdmin);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { conversationId } = req.body || {};

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const success = await chatService.markMessagesAsRead(
    supabaseAdmin,
    conversationId,
    'admin',
    authResult.user?.id,
    authResult.user?.name || authResult.user?.email
  );

  if (!success) {
    return respond(res, 500, { error: 'Failed to mark messages as read' });
  }

  return respond(res, 200, { success: true });
}
