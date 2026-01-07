-- =============================================================================
-- COMPREHENSIVE FIX: Ensure current user is admin
-- =============================================================================
-- This will set the currently logged-in user as admin
-- Run this in Supabase Dashboard while logged in
-- =============================================================================

BEGIN;

-- Step 1: Check who is currently logged in
DO $$
DECLARE
    current_user_id UUID;
    current_email TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Get current auth user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No user is logged in! Please log in first.';
    END IF;
    
    -- Get email from auth.users
    SELECT email INTO current_email FROM auth.users WHERE id = current_user_id;
    
    RAISE NOTICE 'Currently logged in as: % (ID: %)', current_email, current_user_id;
    
    -- Check if user exists in public.users
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE auth_user_id = current_user_id OR id = current_user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE NOTICE 'User not found in public.users table. Creating...';
        
        -- Create user in public.users
        INSERT INTO public.users (id, email, auth_user_id, is_admin, created_at)
        VALUES (uuid_generate_v4(), current_email, current_user_id, true, NOW())
        ON CONFLICT (email) DO UPDATE
        SET auth_user_id = current_user_id, is_admin = true;
        
        RAISE NOTICE 'Created/updated user in public.users';
    ELSE
        RAISE NOTICE 'User found in public.users table';
    END IF;
    
    -- Set user as admin
    UPDATE public.users
    SET is_admin = true, auth_user_id = current_user_id
    WHERE auth_user_id = current_user_id OR email = current_email;
    
    RAISE NOTICE 'Set user as admin';
    
    -- Test is_admin function
    IF public.is_admin(current_user_id) THEN
        RAISE NOTICE '✓ is_admin() returns TRUE - You can now edit products!';
    ELSE
        RAISE NOTICE '✗ is_admin() returns FALSE - Something is still wrong';
    END IF;
END $$;

COMMIT;

-- Verify the result
SELECT 
    'Current User' as info,
    auth.uid() as user_id,
    auth.email() as email,
    public.is_admin(auth.uid()) as is_admin_result;

SELECT 
    'Admin Users in DB' as info,
    email,
    id,
    auth_user_id,
    is_admin
FROM public.users
WHERE is_admin = true;
