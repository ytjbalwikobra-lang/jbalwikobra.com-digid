-- Migration: Create Live Chat System Tables
-- Date: 2026-02-11
-- Purpose: Enable real-time chat between customers and admins
--          with multi-admin access and comprehensive logging

-- =============================================================================
-- 1. CHAT CONVERSATIONS TABLE
-- =============================================================================
-- Each conversation represents a chat session between a customer and admins

CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Customer info (can be anonymous or authenticated)
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Conversation state
    status VARCHAR(20) CHECK (status IN ('open', 'assigned', 'resolved', 'closed')) DEFAULT 'open',
    subject VARCHAR(255),
    
    -- Assignment
    assigned_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Related entities
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_email ON public.chat_conversations(customer_email);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_admin_id ON public.chat_conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON public.chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON public.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_order_id ON public.chat_conversations(order_id);

-- =============================================================================
-- 2. CHAT MESSAGES TABLE
-- =============================================================================
-- Stores all messages within a conversation

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent conversation
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    
    -- Sender info
    sender_type VARCHAR(20) CHECK (sender_type IN ('customer', 'admin', 'system')) NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL for customers without account
    sender_name VARCHAR(255) NOT NULL,
    
    -- Message content
    message TEXT NOT NULL,
    message_type VARCHAR(20) CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
    
    -- File attachments (if any)
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(255),
    attachment_type VARCHAR(100),
    
    -- Read status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_type ON public.chat_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON public.chat_messages(is_read) WHERE is_read = FALSE;

-- =============================================================================
-- 3. CHAT ADMIN PARTICIPANTS TABLE
-- =============================================================================
-- Tracks which admins have access/joined a conversation (multi-admin support)

CREATE TABLE IF NOT EXISTS public.chat_admin_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationship
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Participation state
    role VARCHAR(20) CHECK (role IN ('primary', 'participant', 'observer')) DEFAULT 'participant',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint: one entry per admin per conversation
    UNIQUE(conversation_id, admin_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_admin_participants_conversation_id ON public.chat_admin_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_admin_participants_admin_id ON public.chat_admin_participants(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_admin_participants_is_active ON public.chat_admin_participants(is_active);

-- =============================================================================
-- 4. CHAT ACTIVITY LOGS TABLE
-- =============================================================================
-- Comprehensive logging of all chat-related activities

CREATE TABLE IF NOT EXISTS public.chat_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Related entities
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    
    -- Actor info
    actor_type VARCHAR(20) CHECK (actor_type IN ('customer', 'admin', 'system')) NOT NULL,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    
    -- Action details
    action VARCHAR(50) NOT NULL, 
    -- Possible actions: 'conversation_started', 'conversation_assigned', 'conversation_reassigned',
    --                   'conversation_resolved', 'conversation_closed', 'conversation_reopened',
    --                   'message_sent', 'message_read', 'admin_joined', 'admin_left',
    --                   'file_uploaded', 'rating_submitted'
    
    -- Details
    details JSONB DEFAULT '{}'::jsonb,
    
    -- IP/User agent for security logging
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_activity_logs_conversation_id ON public.chat_activity_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_activity_logs_actor_id ON public.chat_activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_chat_activity_logs_action ON public.chat_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_chat_activity_logs_created_at ON public.chat_activity_logs(created_at DESC);

-- =============================================================================
-- 5. CHAT RATINGS TABLE
-- =============================================================================
-- Customer satisfaction ratings for chat sessions

CREATE TABLE IF NOT EXISTS public.chat_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Related conversation
    conversation_id UUID NOT NULL UNIQUE REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    
    -- Rating details
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    feedback TEXT,
    
    -- Rated admin (if specific)
    rated_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_chat_ratings_conversation_id ON public.chat_ratings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_ratings_rated_admin_id ON public.chat_ratings(rated_admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_ratings_rating ON public.chat_ratings(rating);

-- =============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all chat tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_admin_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "chat_conversations_service_role_all" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_admin_read" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_customer_read_own" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_anon_insert" ON public.chat_conversations;

DROP POLICY IF EXISTS "chat_messages_service_role_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_admin_read" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_customer_read_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_anon_insert" ON public.chat_messages;

DROP POLICY IF EXISTS "chat_admin_participants_service_role_all" ON public.chat_admin_participants;
DROP POLICY IF EXISTS "chat_admin_participants_admin_read" ON public.chat_admin_participants;

DROP POLICY IF EXISTS "chat_activity_logs_service_role_all" ON public.chat_activity_logs;
DROP POLICY IF EXISTS "chat_activity_logs_admin_read" ON public.chat_activity_logs;

DROP POLICY IF EXISTS "chat_ratings_service_role_all" ON public.chat_ratings;
DROP POLICY IF EXISTS "chat_ratings_customer_insert" ON public.chat_ratings;

-- =============================================================================
-- CHAT_CONVERSATIONS POLICIES
-- =============================================================================

-- Service role full access (for API)
CREATE POLICY "chat_conversations_service_role_all" ON public.chat_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read all conversations
CREATE POLICY "chat_conversations_admin_read" ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.is_admin = TRUE
    )
  );

-- Customers can read their own conversations (by user_id or email)
CREATE POLICY "chat_conversations_customer_read_own" ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Anonymous users can start conversations
CREATE POLICY "chat_conversations_anon_insert" ON public.chat_conversations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =============================================================================
-- CHAT_MESSAGES POLICIES
-- =============================================================================

-- Service role full access
CREATE POLICY "chat_messages_service_role_all" ON public.chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read all messages
CREATE POLICY "chat_messages_admin_read" ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.is_admin = TRUE
    )
  );

-- Customers can read messages from their conversations
CREATE POLICY "chat_messages_customer_read_own" ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
      AND c.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

-- Anyone can insert messages (we validate in API)
CREATE POLICY "chat_messages_anon_insert" ON public.chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =============================================================================
-- CHAT_ADMIN_PARTICIPANTS POLICIES
-- =============================================================================

-- Service role full access
CREATE POLICY "chat_admin_participants_service_role_all" ON public.chat_admin_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read participant info
CREATE POLICY "chat_admin_participants_admin_read" ON public.chat_admin_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.is_admin = TRUE
    )
  );

-- =============================================================================
-- CHAT_ACTIVITY_LOGS POLICIES
-- =============================================================================

-- Service role full access
CREATE POLICY "chat_activity_logs_service_role_all" ON public.chat_activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Only admins can read logs
CREATE POLICY "chat_activity_logs_admin_read" ON public.chat_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.is_admin = TRUE
    )
  );

-- =============================================================================
-- CHAT_RATINGS POLICIES
-- =============================================================================

-- Service role full access
CREATE POLICY "chat_ratings_service_role_all" ON public.chat_ratings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Customers can submit ratings for their conversations
CREATE POLICY "chat_ratings_customer_insert" ON public.chat_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id
      AND c.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

-- =============================================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Trigger for chat_conversations
CREATE TRIGGER update_chat_conversations_updated_at 
  BEFORE UPDATE ON public.chat_conversations 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 8. ENABLE REALTIME FOR CHAT TABLES
-- =============================================================================

-- Enable realtime for chat messages (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TABLE public.chat_conversations IS 'Live chat conversations between customers and admins';
COMMENT ON TABLE public.chat_messages IS 'Individual messages within chat conversations';
COMMENT ON TABLE public.chat_admin_participants IS 'Tracks admin participation in conversations (multi-admin support)';
COMMENT ON TABLE public.chat_activity_logs IS 'Audit log of all chat-related activities';
COMMENT ON TABLE public.chat_ratings IS 'Customer satisfaction ratings for completed chats';

COMMENT ON COLUMN public.chat_conversations.status IS 'open: new/waiting, assigned: admin handling, resolved: completed, closed: archived';
COMMENT ON COLUMN public.chat_admin_participants.role IS 'primary: assigned handler, participant: active helper, observer: view-only';
COMMENT ON COLUMN public.chat_activity_logs.action IS 'Actions: conversation_started, conversation_assigned, message_sent, admin_joined, etc.';
