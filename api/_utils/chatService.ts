/**
 * Chat Service (Backend)
 * 
 * Handles all chat-related database operations.
 * Used by API endpoints to manage conversations, messages, and admin participation.
 * 
 * Tables:
 * - chat_conversations: Conversation sessions
 * - chat_messages: Individual messages
 * - chat_admin_participants: Multi-admin support
 * - chat_activity_logs: Audit logging
 * - chat_ratings: Customer feedback
 */

import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog,
  ChatRating,
  ChatConversationStatus,
  ChatSenderType,
  ChatMessageType,
  ChatAdminRole,
  ChatActivityAction,
  ChatStatistics
} from '../../src/types/chat';

// =============================================================================
// CONVERSATION FUNCTIONS
// =============================================================================

/**
 * Create a new chat conversation
 */
export async function createConversation(
  sb: any,
  data: {
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    userId?: string;
    subject?: string;
    topic?: string;
    gameTitle?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ChatConversation | null> {
  try {
    const { data: conversation, error } = await sb
      .from('chat_conversations')
      .insert({
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        user_id: data.userId,
        subject: data.subject,
        topic: data.topic || 'lainnya',
        game_title: data.gameTitle,
        order_id: data.orderId,
        metadata: data.metadata || {},
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('[ChatService] Error creating conversation:', error);
      return null;
    }

    // Log activity
    await logActivity(sb, {
      conversationId: conversation.id,
      actorType: 'customer',
      actorName: data.customerName || data.customerEmail || 'Anonymous',
      action: 'conversation_started',
      details: { subject: data.subject }
    });

    return mapConversation(conversation);
  } catch (err) {
    console.error('[ChatService] Exception creating conversation:', err);
    return null;
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  sb: any,
  conversationId: string
): Promise<ChatConversation | null> {
  try {
    const { data, error } = await sb
      .from('chat_conversations')
      .select(`
        *,
        assigned_admin:users!chat_conversations_assigned_admin_id_fkey(id, name, email, is_admin)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('[ChatService] Error fetching conversation:', error);
      return null;
    }

    return mapConversation(data);
  } catch (err) {
    console.error('[ChatService] Exception fetching conversation:', err);
    return null;
  }
}

/**
 * List conversations with optional filters
 */
export async function listConversations(
  sb: any,
  options: {
    status?: ChatConversationStatus | ChatConversationStatus[];
    assignedAdminId?: string;
    unassigned?: boolean;
    adminRole?: string;
    currentAdminId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ conversations: ChatConversation[]; total: number }> {
  try {
    let query = sb
      .from('chat_conversations')
      .select(`
        *,
        assigned_admin:users!chat_conversations_assigned_admin_id_fkey(id, name, email, is_admin)
      `, { count: 'exact' });

    // Apply filters
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    if (options.assignedAdminId) {
      query = query.eq('assigned_admin_id', options.assignedAdminId);
    }

    if (options.unassigned) {
      query = query.is('assigned_admin_id', null);
    }

    // Role-based visibility: admin_viewer hanya bisa lihat:
    // - Percakapan yang belum ditangani (open, assigned_admin_id IS NULL)
    // - Percakapan yang ditangani oleh dirinya sendiri
    // super_admin bisa lihat semua
    if (options.adminRole === 'admin_viewer' && options.currentAdminId) {
      query = query.or(`assigned_admin_id.is.null,assigned_admin_id.eq.${options.currentAdminId}`);
    }

    // Pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    query = query
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ChatService] Error listing conversations:', error);
      return { conversations: [], total: 0 };
    }

    const mapped = (data || []).map(mapConversation);

    // Ambil pesan terakhir dan jumlah pesan belum dibaca — dalam try-catch TERPISAH
    // agar kegagalan batch fetch tidak menyebabkan seluruh list conversations kosong
    if (mapped.length > 0) {
      try {
        const convIds = mapped.map(c => c.id);

        // Query langsung: ambil pesan terakhir per percakapan (tanpa RPC)
        const { data: recentMessages, error: msgError } = await sb
          .from('chat_messages')
          .select('id, conversation_id, sender_type, sender_id, sender_name, message, message_type, attachment_url, attachment_name, attachment_type, is_read, read_at, metadata, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(convIds.length * 5); // Batasi jumlah data yang diambil

        if (msgError) {
          console.error('[ChatService] Error fetching recent messages (non-fatal):', msgError);
        } else if (recentMessages && recentMessages.length > 0) {
          // Kelompokkan: ambil pesan terakhir per percakapan
          const lastByConv = new Map<string, any>();
          const unreadByConv = new Map<string, number>();
          
          for (const msg of recentMessages) {
            if (!lastByConv.has(msg.conversation_id)) {
              lastByConv.set(msg.conversation_id, msg);
            }
            if (msg.sender_type !== 'admin' && !msg.is_read) {
              unreadByConv.set(msg.conversation_id, (unreadByConv.get(msg.conversation_id) || 0) + 1);
            }
          }

          // Tempelkan ke mapped conversations
          for (const conv of mapped) {
            const lastMsg = lastByConv.get(conv.id);
            if (lastMsg) {
              conv.lastMessage = mapMessage(lastMsg);
            }
            conv.unreadCount = unreadByConv.get(conv.id) || 0;
          }
        }
      } catch (batchErr) {
        // PENTING: Jangan biarkan error batch fetch menghancurkan response utama
        console.error('[ChatService] Batch fetch last messages failed (non-fatal):', batchErr);
      }
    }

    return {
      conversations: mapped,
      total: count || 0
    };
  } catch (err) {
    console.error('[ChatService] Exception listing conversations:', err);
    return { conversations: [], total: 0 };
  }
}

/**
 * Update conversation status
 */
export async function updateConversationStatus(
  sb: any,
  conversationId: string,
  status: ChatConversationStatus,
  adminId?: string,
  adminName?: string
): Promise<boolean> {
  try {
    const updates: Record<string, unknown> = { status };

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    } else if (status === 'closed') {
      updates.closed_at = new Date().toISOString();
    }

    const { error } = await sb
      .from('chat_conversations')
      .update(updates)
      .eq('id', conversationId);

    if (error) {
      console.error('[ChatService] Error updating conversation status:', error);
      return false;
    }

    // Log activity
    const actionMap: Record<ChatConversationStatus, ChatActivityAction> = {
      'open': 'conversation_reopened',
      'assigned': 'conversation_assigned',
      'resolved': 'conversation_resolved',
      'closed': 'conversation_closed'
    };

    await logActivity(sb, {
      conversationId,
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId,
      actorName: adminName || 'System',
      action: actionMap[status],
      details: { newStatus: status }
    });

    return true;
  } catch (err) {
    console.error('[ChatService] Exception updating conversation status:', err);
    return false;
  }
}

/**
 * Assign conversation to admin
 */
export async function assignConversation(
  sb: any,
  conversationId: string,
  adminId: string,
  assignedByAdminId?: string,
  assignedByAdminName?: string
): Promise<boolean> {
  try {
    // Get current assignment for logging
    const { data: current } = await sb
      .from('chat_conversations')
      .select('assigned_admin_id')
      .eq('id', conversationId)
      .single();

    const previousAdminId = current?.assigned_admin_id;
    const isReassignment = previousAdminId && previousAdminId !== adminId;

    // Update assignment
    const { error } = await sb
      .from('chat_conversations')
      .update({
        assigned_admin_id: adminId,
        status: 'assigned'
      })
      .eq('id', conversationId);

    if (error) {
      console.error('[ChatService] Error assigning conversation:', error);
      return false;
    }

    // Add admin as participant with primary role
    await addAdminParticipant(sb, conversationId, adminId, 'primary');

    // Log activity
    await logActivity(sb, {
      conversationId,
      actorType: 'admin',
      actorId: assignedByAdminId || adminId,
      actorName: assignedByAdminName || 'Admin',
      action: isReassignment ? 'conversation_reassigned' : 'conversation_assigned',
      details: {
        newAdminId: adminId,
        previousAdminId: previousAdminId || null
      }
    });

    return true;
  } catch (err) {
    console.error('[ChatService] Exception assigning conversation:', err);
    return false;
  }
}

// =============================================================================
// MESSAGE FUNCTIONS
// =============================================================================

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  sb: any,
  data: {
    conversationId: string;
    senderType: ChatSenderType;
    senderId?: string;
    senderName: string;
    message: string;
    messageType?: ChatMessageType;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ChatMessage | null> {
  try {
    const { data: msg, error } = await sb
      .from('chat_messages')
      .insert({
        conversation_id: data.conversationId,
        sender_type: data.senderType,
        sender_id: data.senderId,
        sender_name: data.senderName,
        message: data.message,
        message_type: data.messageType || 'text',
        attachment_url: data.attachmentUrl,
        attachment_name: data.attachmentName,
        attachment_type: data.attachmentType,
        metadata: data.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('[ChatService] Error sending message:', error);
      return null;
    }

    // Update conversation's last_message_at
    await sb
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', data.conversationId);

    // Log activity
    await logActivity(sb, {
      conversationId: data.conversationId,
      messageId: msg.id,
      actorType: data.senderType,
      actorId: data.senderId,
      actorName: data.senderName,
      action: 'message_sent',
      details: { messageType: data.messageType || 'text' }
    });

    return mapMessage(msg);
  } catch (err) {
    console.error('[ChatService] Exception sending message:', err);
    return null;
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  sb: any,
  conversationId: string,
  options: {
    limit?: number;
    before?: string;
  } = {}
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  try {
    let query = sb
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (options.before) {
      query = query.lt('created_at', options.before);
    }

    const limit = options.limit || 50;
    query = query.limit(limit + 1); // Fetch one extra to check hasMore

    const { data, error } = await query;

    if (error) {
      console.error('[ChatService] Error fetching messages:', error);
      return { messages: [], hasMore: false };
    }

    const hasMore = data.length > limit;
    const messages = data.slice(0, limit).map(mapMessage);

    // Return in chronological order for display
    return { messages: messages.reverse(), hasMore };
  } catch (err) {
    console.error('[ChatService] Exception fetching messages:', err);
    return { messages: [], hasMore: false };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  sb: any,
  conversationId: string,
  readBy: ChatSenderType,
  readerId?: string,
  readerName?: string
): Promise<boolean> {
  try {
    // Mark all unread messages from the other party as read
    const senderTypeToMark = readBy === 'admin' ? 'customer' : 'admin';
    
    const { error } = await sb
      .from('chat_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('sender_type', senderTypeToMark)
      .eq('is_read', false);

    if (error) {
      console.error('[ChatService] Error marking messages as read:', error);
      return false;
    }

    // Log activity
    await logActivity(sb, {
      conversationId,
      actorType: readBy,
      actorId: readerId,
      actorName: readerName || (readBy === 'admin' ? 'Admin' : 'Customer'),
      action: 'message_read',
      details: { markedReadFor: senderTypeToMark }
    });

    return true;
  } catch (err) {
    console.error('[ChatService] Exception marking messages as read:', err);
    return false;
  }
}

// =============================================================================
// ADMIN PARTICIPANT FUNCTIONS
// =============================================================================

/**
 * Add admin participant to conversation
 */
export async function addAdminParticipant(
  sb: any,
  conversationId: string,
  adminId: string,
  role: ChatAdminRole = 'participant'
): Promise<boolean> {
  try {
    // If adding as primary, demote existing primary
    if (role === 'primary') {
      await sb
        .from('chat_admin_participants')
        .update({ role: 'participant' })
        .eq('conversation_id', conversationId)
        .eq('role', 'primary');
    }

    // Upsert participant
    const { error } = await sb
      .from('chat_admin_participants')
      .upsert({
        conversation_id: conversationId,
        admin_id: adminId,
        role,
        is_active: true,
        joined_at: new Date().toISOString(),
        left_at: null
      }, {
        onConflict: 'conversation_id,admin_id'
      });

    if (error) {
      console.error('[ChatService] Error adding admin participant:', error);
      return false;
    }

    // Log activity
    await logActivity(sb, {
      conversationId,
      actorType: 'admin',
      actorId: adminId,
      action: 'admin_joined',
      details: { role }
    });

    return true;
  } catch (err) {
    console.error('[ChatService] Exception adding admin participant:', err);
    return false;
  }
}

/**
 * Remove admin participant from conversation
 */
export async function removeAdminParticipant(
  sb: any,
  conversationId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_admin_participants')
      .update({
        is_active: false,
        left_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('admin_id', adminId);

    if (error) {
      console.error('[ChatService] Error removing admin participant:', error);
      return false;
    }

    // Log activity
    await logActivity(sb, {
      conversationId,
      actorType: 'admin',
      actorId: adminId,
      action: 'admin_left',
      details: {}
    });

    return true;
  } catch (err) {
    console.error('[ChatService] Exception removing admin participant:', err);
    return false;
  }
}

/**
 * Get admin participants for a conversation
 */
export async function getAdminParticipants(
  sb: any,
  conversationId: string,
  activeOnly: boolean = true
): Promise<ChatAdminParticipant[]> {
  try {
    let query = sb
      .from('chat_admin_participants')
      .select(`
        *,
        admin:users!chat_admin_participants_admin_id_fkey(id, name, email, is_admin)
      `)
      .eq('conversation_id', conversationId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ChatService] Error fetching participants:', error);
      return [];
    }

    return (data || []).map(mapAdminParticipant);
  } catch (err) {
    console.error('[ChatService] Exception fetching participants:', err);
    return [];
  }
}

// =============================================================================
// RATING FUNCTIONS
// =============================================================================

/**
 * Submit a rating for a conversation
 */
export async function submitRating(
  sb: any,
  data: {
    conversationId: string;
    rating: number;
    feedback?: string;
    ratedAdminId?: string;
  }
): Promise<ChatRating | null> {
  try {
    const { data: ratingData, error } = await sb
      .from('chat_ratings')
      .insert({
        conversation_id: data.conversationId,
        rating: data.rating,
        feedback: data.feedback,
        rated_admin_id: data.ratedAdminId
      })
      .select()
      .single();

    if (error) {
      console.error('[ChatService] Error submitting rating:', error);
      return null;
    }

    // Log activity
    await logActivity(sb, {
      conversationId: data.conversationId,
      actorType: 'customer',
      action: 'rating_submitted',
      details: { rating: data.rating }
    });

    return mapRating(ratingData);
  } catch (err) {
    console.error('[ChatService] Exception submitting rating:', err);
    return null;
  }
}

// =============================================================================
// ACTIVITY LOG FUNCTIONS
// =============================================================================

/**
 * Log chat activity
 */
export async function logActivity(
  sb: any,
  data: {
    conversationId?: string;
    messageId?: string;
    actorType: ChatSenderType;
    actorId?: string;
    actorName?: string;
    action: ChatActivityAction;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    await sb.from('chat_activity_logs').insert({
      conversation_id: data.conversationId,
      message_id: data.messageId,
      actor_type: data.actorType,
      actor_id: data.actorId,
      actor_name: data.actorName,
      action: data.action,
      details: data.details || {},
      ip_address: data.ipAddress,
      user_agent: data.userAgent
    });
  } catch (err) {
    // Non-critical, just log the error
    console.error('[ChatService] Error logging activity:', err);
  }
}

/**
 * Get activity logs for a conversation
 */
export async function getActivityLogs(
  sb: any,
  conversationId: string,
  limit: number = 100
): Promise<ChatActivityLog[]> {
  try {
    const { data, error } = await sb
      .from('chat_activity_logs')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ChatService] Error fetching activity logs:', error);
      return [];
    }

    return (data || []).map(mapActivityLog);
  } catch (err) {
    console.error('[ChatService] Exception fetching activity logs:', err);
    return [];
  }
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get chat statistics for admin dashboard
 */
export async function getChatStatistics(sb: any): Promise<ChatStatistics> {
  try {
    // Get conversation counts by status
    const { data: statusCounts, error: countError } = await sb
      .from('chat_conversations')
      .select('status')
      .then((result: any) => {
        if (result.error) return { data: null, error: result.error };
        const counts = result.data.reduce((acc: Record<string, number>, row: any) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {});
        return { data: counts, error: null };
      });

    if (countError) {
      console.error('[ChatService] Error fetching status counts:', countError);
    }

    // Get ratings stats
    const { data: ratings, error: ratingsError } = await sb
      .from('chat_ratings')
      .select('rating');

    if (ratingsError) {
      console.error('[ChatService] Error fetching ratings:', ratingsError);
    }

    const ratingsData = ratings || [];
    const avgRating = ratingsData.length > 0
      ? ratingsData.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingsData.length
      : undefined;

    return {
      totalConversations: Object.values(statusCounts || {}).reduce((a: number, b: any) => a + b, 0) as number,
      openConversations: statusCounts?.open || 0,
      assignedConversations: statusCounts?.assigned || 0,
      resolvedConversations: (statusCounts?.resolved || 0) + (statusCounts?.closed || 0),
      averageRating: avgRating,
      ratingsCount: ratingsData.length
    };
  } catch (err) {
    console.error('[ChatService] Exception fetching statistics:', err);
    return {
      totalConversations: 0,
      openConversations: 0,
      assignedConversations: 0,
      resolvedConversations: 0,
      ratingsCount: 0
    };
  }
}

// =============================================================================
// DATA MAPPERS
// =============================================================================

function mapConversation(row: any): ChatConversation {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    userId: row.user_id,
    status: row.status,
    subject: row.subject,
    topic: row.topic || 'lainnya',
    gameTitle: row.game_title,
    assignedAdminId: row.assigned_admin_id,
    assignedAdmin: row.assigned_admin ? {
      id: row.assigned_admin.id,
      name: row.assigned_admin.name,
      email: row.assigned_admin.email,
      isAdmin: row.assigned_admin.is_admin
    } : undefined,
    orderId: row.order_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at
  };
}

function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    senderName: row.sender_name,
    message: row.message,
    messageType: row.message_type,
    attachmentUrl: row.attachment_url,
    attachmentName: row.attachment_name,
    attachmentType: row.attachment_type,
    isRead: row.is_read,
    readAt: row.read_at,
    metadata: row.metadata,
    createdAt: row.created_at
  };
}

function mapAdminParticipant(row: any): ChatAdminParticipant {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    adminId: row.admin_id,
    role: row.role,
    isActive: row.is_active,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    admin: row.admin ? {
      id: row.admin.id,
      name: row.admin.name,
      email: row.admin.email,
      isAdmin: row.admin.is_admin
    } : undefined
  };
}

function mapActivityLog(row: any): ChatActivityLog {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  };
}

function mapRating(row: any): ChatRating {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    rating: row.rating,
    feedback: row.feedback,
    ratedAdminId: row.rated_admin_id,
    createdAt: row.created_at
  };
}

// =============================================================================
// TYPING INDICATORS
// =============================================================================

/**
 * Set typing indicator for a user in a conversation
 */
export async function setTypingIndicator(
  sb: any,
  data: {
    conversationId: string;
    userId?: string;
    userType: ChatSenderType;
    userName?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_typing_indicators')
      .upsert({
        conversation_id: data.conversationId,
        user_id: data.userId,
        user_type: data.userType,
        user_name: data.userName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id,user_id,user_type'
      });

    if (error) {
      console.error('[ChatService] Error setting typing indicator:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception setting typing indicator:', err);
    return false;
  }
}

/**
 * Remove typing indicator
 */
export async function removeTypingIndicator(
  sb: any,
  data: {
    conversationId: string;
    userId?: string;
    userType: ChatSenderType;
  }
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_typing_indicators')
      .delete()
      .match({
        conversation_id: data.conversationId,
        user_id: data.userId,
        user_type: data.userType
      });

    if (error) {
      console.error('[ChatService] Error removing typing indicator:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception removing typing indicator:', err);
    return false;
  }
}

/**
 * Get typing indicators for a conversation
 */
export async function getTypingIndicators(
  sb: any,
  conversationId: string
): Promise<any[]> {
  try {
    const { data, error } = await sb
      .from('chat_typing_indicators')
      .select('*')
      .eq('conversation_id', conversationId)
      .gte('updated_at', new Date(Date.now() - 10000).toISOString()); // Only get indicators from last 10 seconds

    if (error) {
      console.error('[ChatService] Error getting typing indicators:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[ChatService] Exception getting typing indicators:', err);
    return [];
  }
}

// =============================================================================
// CANNED RESPONSES
// =============================================================================

/**
 * Get all active canned responses
 */
export async function getCannedResponses(sb: any): Promise<any[]> {
  try {
    const { data, error } = await sb
      .from('chat_canned_responses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[ChatService] Error getting canned responses:', error);
      return [];
    }

    // Map snake_case ke camelCase agar konsisten dengan tipe frontend
    return (data || []).map(mapCannedResponse);
  } catch (err) {
    console.error('[ChatService] Exception getting canned responses:', err);
    return [];
  }
}

/** Map row database canned_response ke camelCase */
function mapCannedResponse(row: any) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    category: row.category,
    shortcut: row.shortcut,
    usageCount: row.usage_count ?? 0,
    lastUsedAt: row.last_used_at,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get canned response by shortcut
 */
export async function getCannedResponseByShortcut(
  sb: any,
  shortcut: string
): Promise<any | null> {
  try {
    const { data, error } = await sb
      .from('chat_canned_responses')
      .select('*')
      .eq('shortcut', shortcut)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('[ChatService] Error getting canned response by shortcut:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[ChatService] Exception getting canned response by shortcut:', err);
    return null;
  }
}

/**
 * Create a new canned response
 */
export async function createCannedResponse(
  sb: any,
  data: {
    title: string;
    message: string;
    category?: string;
    shortcut?: string;
    sortOrder?: number;
    createdBy?: string;
  }
): Promise<any | null> {
  try {
    const { data: response, error } = await sb
      .from('chat_canned_responses')
      .insert({
        title: data.title,
        message: data.message,
        category: data.category,
        shortcut: data.shortcut,
        sort_order: data.sortOrder || 0,
        created_by: data.createdBy
      })
      .select()
      .single();

    if (error) {
      console.error('[ChatService] Error creating canned response:', error);
      return null;
    }

    return response;
  } catch (err) {
    console.error('[ChatService] Exception creating canned response:', err);
    return null;
  }
}

/**
 * Update a canned response
 */
export async function updateCannedResponse(
  sb: any,
  id: string,
  data: {
    title?: string;
    message?: string;
    category?: string;
    shortcut?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
): Promise<any | null> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.shortcut !== undefined) updateData.shortcut = data.shortcut;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const { data: response, error } = await sb
      .from('chat_canned_responses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ChatService] Error updating canned response:', error);
      return null;
    }

    return response;
  } catch (err) {
    console.error('[ChatService] Exception updating canned response:', err);
    return null;
  }
}

/**
 * Delete a canned response
 */
export async function deleteCannedResponse(
  sb: any,
  id: string
): Promise<boolean> {
  try {
    const { error } = await sb
      .from('chat_canned_responses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ChatService] Error deleting canned response:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception deleting canned response:', err);
    return false;
  }
}

/**
 * Increment usage count for a canned response
 */
export async function incrementCannedResponseUsage(
  sb: any,
  id: string
): Promise<boolean> {
  try {
    const { error } = await sb.rpc('increment_canned_response_usage', {
      response_id: id
    });

    if (error) {
      console.error('[ChatService] Error incrementing canned response usage:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ChatService] Exception incrementing canned response usage:', err);
    return false;
  }
}

