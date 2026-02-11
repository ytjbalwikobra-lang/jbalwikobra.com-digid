-- Migration: Enable Supabase Realtime for Live Chat Tables
-- Date: 2026-02-11
-- Purpose: Enable realtime subscriptions for chat tables to support live updates

-- =============================================================================
-- ENABLE REALTIME FOR CHAT TABLES
-- =============================================================================

-- Safe idempotent way to add tables to publication
-- Only adds if not already a member

DO $$
BEGIN
    -- Enable realtime for chat_conversations
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
    END IF;

    -- Enable realtime for chat_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;

    -- Enable realtime for chat_admin_participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_admin_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_admin_participants;
    END IF;

    -- Enable realtime for chat_activity_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_activity_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_activity_logs;
    END IF;
END $$;

-- =============================================================================
-- NOTES
-- =============================================================================
-- After running this migration:
-- 1. Chat conversations will broadcast updates when status changes
-- 2. New messages will be received in real-time
-- 3. Admin participant changes will update immediately
-- 4. Activity logs will update live (if needed)
--
-- No additional configuration needed - Supabase Realtime is enabled by default
-- in projects. This migration just adds our tables to the publication.
