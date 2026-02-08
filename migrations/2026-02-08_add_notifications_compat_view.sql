-- ============================================================
-- Migration: Add backward-compatibility VIEW for renamed notifications table
-- Date: 2026-02-08
-- Purpose: After renaming notifications → customer_notifications, some database
--          objects (triggers, cached query plans, Supabase realtime configs) may
--          still reference the old `public.notifications` name.
--          This VIEW acts as a transparent alias so existing DB references work.
-- ============================================================

BEGIN;

-- 1. Create a backward-compatibility VIEW
--    PostgreSQL auto-updatable views allow INSERT/UPDATE/DELETE through simple views
CREATE OR REPLACE VIEW public.notifications AS
  SELECT * FROM public.customer_notifications;

-- 2. Also create a compat view for the reads table
CREATE OR REPLACE VIEW public.notification_reads AS
  SELECT * FROM public.customer_notification_reads;

-- 3. Grant same permissions as the underlying tables
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;

-- 4. Add comments to document these are compatibility shims
COMMENT ON VIEW public.notifications IS 'DEPRECATED: Backward-compatibility view. Use customer_notifications instead.';
COMMENT ON VIEW public.notification_reads IS 'DEPRECATED: Backward-compatibility view. Use customer_notification_reads instead.';

COMMIT;
