import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCacheHeaders, CacheStrategies } from './_utils/cacheControl.js';
import { setCorsHeaders, handleCorsPreFlight } from './_utils/corsConfig.js';
import { validateAdminAuth, AuthResult } from './_middleware/authMiddleware.js';
import * as chatService from './_utils/chatService.js';

// Bersihkan variabel environment
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n\\]/g, '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\r\n\\]/g, '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').replace(/[\r\n\\]/g, '').trim();

// Semua operasi chat backend menggunakan service role untuk bypass RLS
const supabaseAdminKey = supabaseServiceKey || supabaseAnonKey;
const supabaseAdmin = supabaseUrl && supabaseAdminKey ? createClient(supabaseUrl, supabaseAdminKey) : null;

// Rate limiting dasar — CATATAN: Map direset setiap cold start di serverless.
// Untuk proteksi penuh, gunakan Vercel Firewall / Upstash Redis rate limiter.
// Map ini hanya melindungi dalam satu instance (warm invocation burst).
const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT = 60;
const RATE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup setiap 5 menit

// Cleanup rateMap secara periodik untuk mencegah memory leak
let lastCleanup = Date.now();
function cleanupRateMap() {
  const now = Date.now();
  if (now - lastCleanup < RATE_CLEANUP_INTERVAL_MS) return;
  
  for (const [key, entry] of rateMap.entries()) {
    if (now - entry.ts > RATE_WINDOW_MS * 2) {
      rateMap.delete(key);
    }
  }
  lastCleanup = now;
}

function rateLimit(key: string): boolean {
  cleanupRateMap(); // Cleanup stale entries
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
  setCacheHeaders(res, CacheStrategies.NoCache); // Tanpa cache untuk chat
  res.status(status).send(JSON.stringify(body));
}

function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         (req.headers['x-real-ip'] as string) || 
         'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  setCorsHeaders(req, res);
  if (handleCorsPreFlight(req, res)) return;

  // Pembatasan rate
  const ip = getClientIP(req);
  if (!rateLimit(ip)) {
    return respond(res, 429, { error: 'Too many requests' });
  }

  // Cek koneksi Supabase
  if (!supabaseAdmin) {
    return respond(res, 500, { error: 'Database not configured' });
  }

  const { action } = req.query;

  try {
    switch (action) {
      // =========================================================================
      // ENDPOINT PELANGGAN (tanpa autentikasi)
      // =========================================================================
      
      case 'start-conversation':
        return await handleStartConversation(req, res);
      
      case 'send-message':
        return await handleSendMessage(req, res, false);
      
      case 'get-messages':
        return await handleGetMessages(req, res, false);
      
      case 'submit-rating':
        return await handleSubmitRating(req, res);

      case 'upload-attachment':
        return await handleUploadAttachment(req, res);

      case 'get-conversation':
        return await handleCustomerGetConversation(req, res);

      case 'customer-list-conversations':
        return await handleCustomerListConversations(req, res);

      // =========================================================================
      // ENDPOINT ADMIN (perlu autentikasi)
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

      // =========================================================================
      // ENDPOINT INDIKATOR MENGETIK
      // =========================================================================
      
      case 'set-typing':
        return await handleSetTyping(req, res);
      
      case 'stop-typing':
        return await handleStopTyping(req, res);
      
      case 'get-typing':
        return await handleGetTyping(req, res);

      // =========================================================================
      // ENDPOINT TEMPLATE RESPON CEPAT (khusus admin)
      // =========================================================================
      
      case 'admin-get-canned-responses':
        return await handleGetCannedResponses(req, res);
      
      case 'admin-create-canned-response':
        return await handleCreateCannedResponse(req, res);
      
      case 'admin-update-canned-response':
        return await handleUpdateCannedResponse(req, res);
      
      case 'admin-delete-canned-response':
        return await handleDeleteCannedResponse(req, res);

      case 'admin-increment-canned-usage':
        return await handleIncrementCannedUsage(req, res);

      // =========================================================================
      // ENDPOINT PENGATURAN CHAT
      // =========================================================================
      
      case 'get-chat-settings':
        return await handleGetChatSettings(req, res);
      
      case 'admin-update-chat-settings':
        return await handleUpdateChatSettings(req, res);

      default:
        return respond(res, 400, { error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('[chat.ts] Handler error:', error);
    return respond(res, 500, { error: 'Internal server error' });
  }
}

// =============================================================================
// HANDLER PELANGGAN
// =============================================================================

/** Handler ambil detail percakapan untuk pelanggan (termasuk nama admin yang menangani) */
async function handleCustomerGetConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { conversationId } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const conversation = await chatService.getConversation(supabaseAdmin, conversationId as string);

  if (!conversation) {
    return respond(res, 404, { error: 'Conversation not found' });
  }

  // Kembalikan data percakapan termasuk assignedAdmin (nama admin yang menangani)
  return respond(res, 200, {
    id: conversation.id,
    status: conversation.status,
    assignedAdminId: conversation.assignedAdminId,
    assignedAdmin: conversation.assignedAdmin || null
  });
}

/** Handler daftar percakapan milik user yang login (hanya open/assigned) */
async function handleCustomerListConversations(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { userId, customerEmail } = req.query;

  if (!userId && !customerEmail) {
    return respond(res, 400, { error: 'userId or customerEmail required' });
  }

  const sb = supabaseAdmin!;

  try {
    let query = sb
      .from('chat_conversations')
      .select('id, customer_name, customer_email, subject, topic, status, created_at, updated_at, last_message_at')
      .in('status', ['open', 'assigned'])
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (userId) {
      query = query.eq('user_id', userId as string);
    } else {
      query = query.eq('customer_email', customerEmail as string);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[chat.ts] Error listing customer conversations:', error);
      return respond(res, 500, { error: 'Failed to list conversations' });
    }

    // Ambil pesan terakhir untuk setiap percakapan
    const conversations = (data || []).map((c: any) => ({
      id: c.id,
      customerName: c.customer_name,
      customerEmail: c.customer_email,
      subject: c.subject,
      topic: c.topic,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      lastMessageAt: c.last_message_at,
    }));

    // Ambil pesan terakhir dan unread count secara batch
    if (conversations.length > 0) {
      const convIds = conversations.map((c: any) => c.id);
      const { data: recentMsgs } = await sb
        .from('chat_messages')
        .select('conversation_id, message, sender_type, is_read, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(convIds.length * 3);

      if (recentMsgs) {
        const lastByConv = new Map<string, any>();
        const unreadByConv = new Map<string, number>();
        
        for (const msg of recentMsgs) {
          if (!lastByConv.has(msg.conversation_id)) {
            lastByConv.set(msg.conversation_id, msg);
          }
          if (msg.sender_type === 'admin' && !msg.is_read) {
            unreadByConv.set(msg.conversation_id, (unreadByConv.get(msg.conversation_id) || 0) + 1);
          }
        }

        for (const conv of conversations) {
          const last = lastByConv.get(conv.id);
          if (last) {
            (conv as any).lastMessagePreview = last.message?.substring(0, 80) || '';
            (conv as any).lastMessageSender = last.sender_type;
          }
          (conv as any).unreadCount = unreadByConv.get(conv.id) || 0;
        }
      }
    }

    return respond(res, 200, { conversations });
  } catch (err) {
    console.error('[chat.ts] Exception listing customer conversations:', err);
    return respond(res, 500, { error: 'Internal server error' });
  }
}

/** Handler upload lampiran file ke Supabase Storage (gambar + dokumen) */
async function handleUploadAttachment(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { conversationId, base64Data, fileName, mimeType, customerEmail } = req.body || {};

  if (!conversationId || !base64Data || !fileName || !mimeType) {
    return respond(res, 400, { error: 'conversationId, base64Data, fileName, and mimeType required' });
  }

  // Validasi ownership: cek apakah admin (via auth) atau customer (via email)
  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    // Bukan admin — validasi sebagai customer
    if (!customerEmail) {
      return respond(res, 400, { error: 'customerEmail required for customer uploads' });
    }
    const conv = await chatService.getConversation(supabaseAdmin, conversationId);
    if (!conv || conv.customerEmail !== customerEmail) {
      return respond(res, 403, { error: 'Forbidden' });
    }
  }

  // Validasi tipe MIME — gambar + dokumen
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!allowedMimes.includes(mimeType)) {
    return respond(res, 400, { error: 'Tipe file tidak didukung. Hanya JPEG, PNG, GIF, WebP, PDF, DOC, DOCX.' });
  }

  // Decode base64
  const buffer = Buffer.from(base64Data, 'base64');

  // Batasan ukuran: 3MB (base64 inflate ~33%, jaga di bawah 4.5MB body limit Vercel)
  if (buffer.length > 3 * 1024 * 1024) {
    return respond(res, 400, { error: 'Ukuran file maksimal 3MB' });
  }

  // Generate path unik: chat-attachments/{conversationId}/{timestamp}_{fileName}
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${conversationId}/${Date.now()}_${sanitizedName}`;

  const sb = supabaseAdmin!;

  // Upload ke Supabase Storage
  const { data, error } = await sb.storage
    .from('chat-attachments')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    console.error('[chat.ts] Upload gagal:', error);
    return respond(res, 500, { error: 'Gagal mengupload file' });
  }

  // Dapatkan URL publik
  const { data: urlData } = sb.storage
    .from('chat-attachments')
    .getPublicUrl(data.path);

  return respond(res, 200, {
    success: true,
    url: urlData.publicUrl,
    fileName: sanitizedName,
    mimeType
  });
}

async function handleStartConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { customerEmail, customerName, customerPhone, subject, topic, gameTitle, initialMessage, orderId, userId, metadata } = req.body || {};

  if (!customerEmail && !customerPhone) {
    return respond(res, 400, { error: 'Email or phone required' });
  }

  const sb = supabaseAdmin!;
  
  // Buat percakapan
  const conversation = await chatService.createConversation(sb, {
    customerEmail,
    customerName,
    customerPhone,
    userId,
    subject,
    topic,
    gameTitle,
    orderId,
    metadata
  });

  if (!conversation) {
    return respond(res, 500, { error: 'Failed to create conversation' });
  }

  // Kirim pesan awal jika ada
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

  // Validasi autentikasi admin jika endpoint admin
  let authAdmin: AuthResult | null = null;
  if (isAdmin) {
    const authResult = await validateAdminAuth(req);
    if (!authResult.valid) {
      return respond(res, 401, { error: authResult.error || 'Unauthorized' });
    }
    authAdmin = authResult;
  }

  const { conversationId, message, messageType, attachmentUrl, attachmentName, attachmentType, metadata } = req.body || {};

  if (!conversationId || (!message && !attachmentUrl)) {
    return respond(res, 400, { error: 'conversationId and (message or attachmentUrl) required' });
  }

  // Validasi panjang pesan — maks 5000 karakter
  if (message && message.length > 5000) {
    return respond(res, 400, { error: 'Pesan terlalu panjang (maks 5000 karakter)' });
  }

  const sb = isAdmin ? supabaseAdmin : (supabaseAdmin!);

  // Untuk pelanggan, WAJIB sertakan customerEmail dan validasi ownership
  if (!isAdmin) {
    const { customerEmail } = req.body || {};
    if (!customerEmail) {
      return respond(res, 400, { error: 'customerEmail required' });
    }
    const conv = await chatService.getConversation(sb, conversationId);
    if (!conv || conv.customerEmail !== customerEmail) {
      return respond(res, 403, { error: 'Forbidden' });
    }
  }

  // Kontrol akses chat: jika percakapan sudah ditangani (assigned/resolved/closed),
  // hanya admin yang menangani atau super_admin yang boleh mengirim pesan
  if (isAdmin && authAdmin) {
    const isSuperAdmin = authAdmin.role === 'super_admin';
    if (!isSuperAdmin) {
      const conv = await chatService.getConversation(sb, conversationId);
      if (conv && conv.assignedAdminId && conv.assignedAdminId !== authAdmin.userId) {
        if (conv.status === 'assigned' || conv.status === 'resolved' || conv.status === 'closed') {
          return respond(res, 403, { 
            error: 'chat_locked',
            message: 'Percakapan ini sedang ditangani admin lain. Hanya admin yang menangani atau super admin yang bisa membalas.'
          });
        }
      }
    }
  }

  // Jika messageType = 'system' dan ada metadata purchaseEmbed, sender = system
  const isSystemEmbed = messageType === 'system' && metadata?.embedType === 'purchase_history';
  const senderType = isSystemEmbed ? 'system' : (isAdmin ? 'admin' : 'customer');
  const senderName = isSystemEmbed ? 'System'
    : isAdmin 
      ? (authAdmin?.userName || authAdmin?.userEmail || 'Admin')
      : (req.body.senderName || req.body.customerName || 'Customer');

  const msg = await chatService.sendMessage(sb, {
    conversationId,
    senderType,
    senderId: isAdmin ? authAdmin?.userId : undefined,
    senderName,
    message: message || '',
    messageType: isSystemEmbed ? 'system' : messageType,
    attachmentUrl,
    attachmentName,
    attachmentType,
    metadata: metadata || undefined
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
    const authResult = await validateAdminAuth(req);
    if (!authResult.valid) {
      return respond(res, 401, { error: authResult.error || 'Unauthorized' });
    }
  }

  const { conversationId, limit, before } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const sb = isAdmin ? supabaseAdmin : (supabaseAdmin!);

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

  const sb = supabaseAdmin!;

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
// HANDLER ADMIN
// =============================================================================

async function handleAdminListConversations(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { status, assignedToMe, unassigned, limit, offset } = req.query;

  const result = await chatService.listConversations(supabaseAdmin, {
    status: status as any,
    assignedAdminId: assignedToMe === 'true' ? authResult.userId : undefined,
    unassigned: unassigned === 'true',
    adminRole: authResult.role,
    currentAdminId: authResult.userId,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined
  });

  return respond(res, 200, result);
}

async function handleAdminGetConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
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

  // Ambil juga partisipan dan pesan terbaru
  const [participants, messagesResult] = await Promise.all([
    chatService.getAdminParticipants(supabaseAdmin, conversationId as string),
    chatService.getMessages(supabaseAdmin, conversationId as string, { limit: 50 })
  ]);

  return respond(res, 200, {
    ...conversation,
    participants,
    messages: messagesResult.messages,
    hasMore: messagesResult.hasMore
  });
}

async function handleAssignConversation(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
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
    authResult.userId,
    authResult.userEmail
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

  const authResult = await validateAdminAuth(req);
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
    authResult.userId,
    authResult.userEmail
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

  const authResult = await validateAdminAuth(req);
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
    authResult.userId!,
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

  const authResult = await validateAdminAuth(req);
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
    authResult.userId!
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

  const authResult = await validateAdminAuth(req);
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

  const authResult = await validateAdminAuth(req);
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

  const authResult = await validateAdminAuth(req);
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

  const authResult = await validateAdminAuth(req);
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
    authResult.userId,
    authResult.userEmail
  );

  if (!success) {
    return respond(res, 500, { error: 'Failed to mark messages as read' });
  }

  return respond(res, 200, { success: true });
}

// =============================================================================
// HANDLER INDIKATOR MENGETIK
// =============================================================================

async function handleSetTyping(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { conversationId, userId, userType, userName } = req.body || {};

  if (!conversationId || !userType) {
    return respond(res, 400, { error: 'conversationId and userType required' });
  }

  // Validasi: admin harus autentikasi, customer harus tipe customer
  if (userType === 'admin') {
    const authResult = await validateAdminAuth(req);
    if (!authResult.valid) {
      return respond(res, 401, { error: 'Unauthorized' });
    }
  } else if (userType !== 'customer') {
    return respond(res, 400, { error: 'Invalid userType' });
  }

  const sb = supabaseAdmin!;
  
  const success = await chatService.setTypingIndicator(sb, {
    conversationId,
    userId,
    userType,
    userName
  });

  if (!success) {
    return respond(res, 500, { error: 'Failed to set typing indicator' });
  }

  return respond(res, 200, { success: true });
}

async function handleStopTyping(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { conversationId, userId, userType } = req.body || {};

  if (!conversationId || !userType) {
    return respond(res, 400, { error: 'conversationId and userType required' });
  }

  // Validasi: admin harus autentikasi
  if (userType === 'admin') {
    const authResult = await validateAdminAuth(req);
    if (!authResult.valid) {
      return respond(res, 401, { error: 'Unauthorized' });
    }
  } else if (userType !== 'customer') {
    return respond(res, 400, { error: 'Invalid userType' });
  }

  const sb = supabaseAdmin!;
  
  const success = await chatService.removeTypingIndicator(sb, {
    conversationId,
    userId,
    userType
  });

  if (!success) {
    return respond(res, 500, { error: 'Failed to remove typing indicator' });
  }

  return respond(res, 200, { success: true });
}

async function handleGetTyping(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const { conversationId } = req.query;

  if (!conversationId) {
    return respond(res, 400, { error: 'conversationId required' });
  }

  const sb = supabaseAdmin!;
  
  const indicators = await chatService.getTypingIndicators(sb, conversationId as string);

  return respond(res, 200, { indicators });
}

// =============================================================================
// HANDLER TEMPLATE RESPON CEPAT
// =============================================================================

async function handleGetCannedResponses(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const responses = await chatService.getCannedResponses(supabaseAdmin);

  return respond(res, 200, { responses });
}

async function handleCreateCannedResponse(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { title, message, category, shortcut, sortOrder } = req.body || {};

  if (!title || !message) {
    return respond(res, 400, { error: 'title and message required' });
  }

  const response = await chatService.createCannedResponse(supabaseAdmin, {
    title,
    message,
    category,
    shortcut,
    sortOrder,
    createdBy: authResult.userId
  });

  if (!response) {
    return respond(res, 500, { error: 'Failed to create canned response' });
  }

  return respond(res, 201, { response });
}

async function handleUpdateCannedResponse(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { id, title, message, category, shortcut, isActive, sortOrder } = req.body || {};

  if (!id) {
    return respond(res, 400, { error: 'id required' });
  }

  const response = await chatService.updateCannedResponse(supabaseAdmin, id, {
    title,
    message,
    category,
    shortcut,
    isActive,
    sortOrder
  });

  if (!response) {
    return respond(res, 500, { error: 'Failed to update canned response' });
  }

  return respond(res, 200, { response });
}

async function handleDeleteCannedResponse(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  // Dukung id dari query param (DELETE) atau body (POST)
  const id = (req.query.id as string) || req.body?.id;

  if (!id) {
    return respond(res, 400, { error: 'id required' });
  }

  const success = await chatService.deleteCannedResponse(supabaseAdmin, id as string);

  if (!success) {
    return respond(res, 500, { error: 'Failed to delete canned response' });
  }

  return respond(res, 200, { success: true });
}

/** Increment usage count template respon cepat */
async function handleIncrementCannedUsage(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  const { id } = req.body || {};
  if (!id) {
    return respond(res, 400, { error: 'id required' });
  }

  await chatService.incrementCannedResponseUsage(supabaseAdmin, id);
  return respond(res, 200, { success: true });
}

// =============================================================================
// HANDLER PENGATURAN CHAT
// =============================================================================

/** Ambil pengaturan chat (publik — untuk widget pelanggan) */
async function handleGetChatSettings(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseAdmin!
      .from('chat_settings')
      .select('id, business_hours_enabled, business_hours_start, business_hours_end, business_hours_timezone, offline_message, welcome_message, auto_reply_message, max_concurrent_chats, session_timeout_minutes, created_at, updated_at')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('[chat.ts] Error fetching chat settings:', error);
      // Kembalikan default jika tabel belum ada
      return respond(res, 200, {
        businessHoursEnabled: true,
        businessHoursStart: '09:00',
        businessHoursEnd: '23:00',
        businessHoursTimezone: 'Asia/Jakarta',
        offlineMessage: 'Terima kasih telah menghubungi kami. Saat ini di luar jam operasional. Pesan Anda tetap kami terima dan akan dibalas paling lambat pukul 09:00 WIB.',
        offlineLabel: 'Di Luar Jam Operasional'
      });
    }

    return respond(res, 200, {
      businessHoursEnabled: data.business_hours_enabled,
      businessHoursStart: data.business_hours_start,
      businessHoursEnd: data.business_hours_end,
      businessHoursTimezone: data.business_hours_timezone,
      offlineMessage: data.offline_message,
      offlineLabel: data.offline_label
    });
  } catch (err) {
    console.error('[chat.ts] Exception fetching chat settings:', err);
    return respond(res, 500, { error: 'Failed to get chat settings' });
  }
}

/** Perbarui pengaturan chat (khusus admin) */
async function handleUpdateChatSettings(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const authResult = await validateAdminAuth(req);
  if (!authResult.valid) {
    return respond(res, 401, { error: authResult.error || 'Unauthorized' });
  }

  // Hanya super_admin yang bisa ubah pengaturan chat
  if (authResult.role !== 'super_admin') {
    return respond(res, 403, { error: 'Only super_admin can update chat settings' });
  }

  const {
    businessHoursEnabled,
    businessHoursStart,
    businessHoursEnd,
    businessHoursTimezone,
    offlineMessage,
    offlineLabel
  } = req.body || {};

  try {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authResult.userId
    };

    if (typeof businessHoursEnabled === 'boolean') updates.business_hours_enabled = businessHoursEnabled;
    if (businessHoursStart) updates.business_hours_start = businessHoursStart;
    if (businessHoursEnd) updates.business_hours_end = businessHoursEnd;
    if (businessHoursTimezone) updates.business_hours_timezone = businessHoursTimezone;
    if (offlineMessage !== undefined) updates.offline_message = offlineMessage;
    if (offlineLabel !== undefined) updates.offline_label = offlineLabel;

    const { error } = await supabaseAdmin!
      .from('chat_settings')
      .upsert({ id: 'default', ...updates });

    if (error) {
      console.error('[chat.ts] Error updating chat settings:', error);
      return respond(res, 500, { error: 'Failed to update chat settings' });
    }

    return respond(res, 200, { success: true });
  } catch (err) {
    console.error('[chat.ts] Exception updating chat settings:', err);
    return respond(res, 500, { error: 'Failed to update chat settings' });
  }
}
