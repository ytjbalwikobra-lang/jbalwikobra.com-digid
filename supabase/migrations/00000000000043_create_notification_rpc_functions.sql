-- Create RPC functions for notification service
-- This fixes the missing get_unread_notification_count and mark_notification_read functions

BEGIN;

-- =============================================================================
-- 1. CREATE get_unread_notification_count RPC FUNCTION
-- =============================================================================
-- This function counts unread notifications for a specific user
-- It handles both user-specific notifications and global notifications

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(u_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_notifs_count integer;
  global_notifs_count integer;
  read_count integer;
BEGIN
  -- Count user-specific unread notifications
  SELECT COUNT(*)
  INTO user_notifs_count
  FROM public.notifications
  WHERE user_id = u_id 
    AND is_read = false;
  
  -- Count global notifications (user_id is null)
  SELECT COUNT(*)
  INTO global_notifs_count
  FROM public.notifications
  WHERE user_id IS NULL;
  
  -- Count how many global notifications this user has marked as read
  SELECT COUNT(DISTINCT nr.notification_id)
  INTO read_count
  FROM public.notification_reads nr
  JOIN public.notifications n ON n.id = nr.notification_id
  WHERE nr.user_id = u_id 
    AND n.user_id IS NULL;
  
  -- Return: user-specific unread + (global - global read by user)
  RETURN COALESCE(user_notifs_count, 0) + COALESCE(global_notifs_count, 0) - COALESCE(read_count, 0);
END;
$$;

COMMENT ON FUNCTION public.get_unread_notification_count(uuid) IS 
'Returns the count of unread notifications for a specific user, including user-specific and unread global notifications.';

-- =============================================================================
-- 2. CREATE mark_notification_read RPC FUNCTION
-- =============================================================================
-- This function marks a notification as read for a specific user
-- It handles both user-specific notifications and global notifications

CREATE OR REPLACE FUNCTION public.mark_notification_read(n_id uuid, u_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notif_user_id uuid;
BEGIN
  -- Get the notification's user_id
  SELECT user_id INTO notif_user_id
  FROM public.notifications
  WHERE id = n_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
  
  -- If notification is user-specific (owned by this user), mark it as read directly
  IF notif_user_id = u_id THEN
    UPDATE public.notifications
    SET is_read = true
    WHERE id = n_id AND user_id = u_id;
  
  -- If notification is global (user_id is null), insert into notification_reads
  ELSIF notif_user_id IS NULL THEN
    INSERT INTO public.notification_reads (notification_id, user_id, read_at)
    VALUES (n_id, u_id, NOW())
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.mark_notification_read(uuid, uuid) IS 
'Marks a notification as read for a specific user. Handles both user-specific and global notifications.';

-- =============================================================================
-- 3. CREATE mark_all_notifications_read RPC FUNCTION
-- =============================================================================
-- This function marks all notifications as read for a specific user

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(u_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark all user-specific notifications as read
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = u_id AND is_read = false;
  
  -- For global notifications, insert into notification_reads
  INSERT INTO public.notification_reads (notification_id, user_id, read_at)
  SELECT n.id, u_id, NOW()
  FROM public.notifications n
  WHERE n.user_id IS NULL
  ON CONFLICT (notification_id, user_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.mark_all_notifications_read(uuid) IS 
'Marks all notifications (both user-specific and global) as read for a specific user.';

-- =============================================================================
-- 4. GRANT EXECUTE PERMISSIONS
-- =============================================================================

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) TO authenticated;

-- Grant execute to anon users (for guest notification counts)
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) TO anon;

-- =============================================================================
-- 5. VERIFICATION
-- =============================================================================

-- Test the function with a sample user (replace with actual user ID for testing)
-- SELECT public.get_unread_notification_count('00000000-0000-0000-0000-000000000000');

COMMIT;

-- =============================================================================
-- NOTES
-- =============================================================================
-- 
-- These RPC functions are designed to:
-- 1. Minimize round trips to the database
-- 2. Handle both user-specific and global notifications correctly
-- 3. Use notification_reads table for tracking global notification read status
-- 4. Be secure with SECURITY DEFINER (runs with function creator's privileges)
--
-- Usage from JavaScript:
--   const { data } = await supabase.rpc('get_unread_notification_count', { u_id: userId });
--   await supabase.rpc('mark_notification_read', { n_id: notificationId, u_id: userId });
--   await supabase.rpc('mark_all_notifications_read', { u_id: userId });
-- =============================================================================
