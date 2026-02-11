-- Migration: Enable Supabase Realtime for Live Chat Tables
-- Date: 2026-02-11
-- Purpose: Enable realtime subscriptions for chat tables to support live updates

-- =============================================================================
-- ENABLE REALTIME FOR CHAT TABLES
-- =============================================================================

-- Enable realtime for chat_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable realtime for chat_admin_participants
ALTER PUBLICATION supabase_realtime ADD TABLE chat_admin_participants;

-- Enable realtime for chat_activity_logs (optional - for activity log updates)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_activity_logs;

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
