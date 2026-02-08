-- ============================================================
-- Migration: Rename notifications → customer_notifications
-- Date: 2026-02-08
-- Purpose: Clear naming convention to avoid confusion between
--          admin_notifications (admin panel) and customer_notifications (customer-facing)
-- ============================================================

BEGIN;

-- 1. Rename tables
ALTER TABLE IF EXISTS public.notifications RENAME TO customer_notifications;
ALTER TABLE IF EXISTS public.notification_reads RENAME TO customer_notification_reads;

-- 2. Update foreign key constraint on customer_notification_reads
-- The FK reference updates automatically with RENAME, but we rename the constraint itself for clarity
DO $$
BEGIN
  -- Drop old FK constraint (name may vary, try common names)
  BEGIN
    ALTER TABLE public.customer_notification_reads DROP CONSTRAINT IF EXISTS notification_reads_notification_id_fkey;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.customer_notification_reads DROP CONSTRAINT IF EXISTS fk_notification_reads_notification_id;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  
  -- Clean up orphaned rows that would violate the new FK constraint
  DELETE FROM public.customer_notification_reads
  WHERE notification_id NOT IN (
    SELECT id FROM public.customer_notifications
  );

  -- Recreate FK with new name
  ALTER TABLE public.customer_notification_reads
    ADD CONSTRAINT customer_notification_reads_notification_id_fkey
    FOREIGN KEY (notification_id) REFERENCES public.customer_notifications(id) ON DELETE CASCADE;
END $$;

-- 3. Rename indexes for clarity
ALTER INDEX IF EXISTS idx_notifications_user_id RENAME TO idx_customer_notifications_user_id;
ALTER INDEX IF EXISTS idx_notifications_created_at RENAME TO idx_customer_notifications_created_at;
ALTER INDEX IF EXISTS idx_notifications_is_read RENAME TO idx_customer_notifications_is_read;
ALTER INDEX IF EXISTS idx_notification_reads_user_id RENAME TO idx_customer_notification_reads_user_id;
ALTER INDEX IF EXISTS idx_notification_reads_notification_id RENAME TO idx_customer_notification_reads_notification_id;

-- 4. Drop and recreate RLS policies with new table names
-- customer_notifications policies
DROP POLICY IF EXISTS "notifications_read_policy" ON public.customer_notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.customer_notifications;
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.customer_notifications;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_notifications_read_policy" ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
  );

CREATE POLICY "customer_notifications_update_policy" ON public.customer_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_notifications_service_role_all" ON public.customer_notifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- customer_notification_reads policies
DROP POLICY IF EXISTS "notification_reads_policy" ON public.customer_notification_reads;
DROP POLICY IF EXISTS "notification_reads_service_role_all" ON public.customer_notification_reads;

ALTER TABLE public.customer_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_notification_reads_policy" ON public.customer_notification_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_notification_reads_service_role_all" ON public.customer_notification_reads
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. Recreate RPC functions to reference new table names

-- 5a. get_unread_notification_count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(u_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_unread integer;
  global_unread integer;
BEGIN
  -- Count user-specific unread
  SELECT COUNT(*) INTO user_unread
  FROM public.customer_notifications
  WHERE user_id = u_id AND is_read = false;

  -- Count global notifications not yet read by this user
  SELECT COUNT(*) INTO global_unread
  FROM public.customer_notifications n
  WHERE n.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.customer_notification_reads nr
      WHERE nr.notification_id = n.id AND nr.user_id = u_id
    );

  RETURN user_unread + global_unread;
END;
$$;

-- 5b. mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(n_id uuid, u_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_user_id uuid;
BEGIN
  -- Get the notification's user_id
  SELECT user_id INTO notif_user_id
  FROM public.customer_notifications
  WHERE id = n_id;

  IF notif_user_id = u_id THEN
    -- User-specific notification: update is_read
    UPDATE public.customer_notifications
    SET is_read = true
    WHERE id = n_id AND user_id = u_id;
  ELSIF notif_user_id IS NULL THEN
    -- Global notification: insert into reads table
    INSERT INTO public.customer_notification_reads (notification_id, user_id, read_at)
    VALUES (n_id, u_id, NOW())
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END IF;
END;
$$;

-- 5c. mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(u_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark all user-specific as read
  UPDATE public.customer_notifications
  SET is_read = true
  WHERE user_id = u_id AND is_read = false;

  -- Insert reads for all unread global notifications
  INSERT INTO public.customer_notification_reads (notification_id, user_id, read_at)
  SELECT n.id, u_id, NOW()
  FROM public.customer_notifications n
  WHERE n.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.customer_notification_reads nr
      WHERE nr.notification_id = n.id AND nr.user_id = u_id
    )
  ON CONFLICT (notification_id, user_id) DO NOTHING;
END;
$$;

-- 6. Ensure grants
GRANT SELECT, UPDATE ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notification_reads TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;
GRANT ALL ON public.customer_notification_reads TO service_role;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) TO authenticated;

-- 7. Add helpful comments
COMMENT ON TABLE public.customer_notifications IS 'Customer-facing notifications (payment confirmations, order updates, promos). Not to be confused with admin_notifications.';
COMMENT ON TABLE public.customer_notification_reads IS 'Tracks which global customer notifications have been read by each user.';

COMMIT;
