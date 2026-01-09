-- =============================================================================
-- SIMPLIFIED is_admin FUNCTION - USERS TABLE ONLY
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- This removes the profiles table fallback since it doesn't exist
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
DECLARE
    user_is_admin boolean;
BEGIN
    -- Check users table only
    SELECT is_admin INTO user_is_admin
    FROM public.users
    WHERE auth_user_id = uid OR id = uid
    LIMIT 1;
    
    -- Return the result (false if not found)
    RETURN COALESCE(user_is_admin, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin(uuid) IS 
'Checks if a user is an admin by looking up their auth UID in the users table.';

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Test 1: Check if you're admin (should now work without error)
SELECT public.is_admin(auth.uid()) as am_i_admin;

-- Test 2: List all admin users
SELECT 
    email,
    name,
    is_admin,
    auth_user_id
FROM public.users 
WHERE is_admin = true;

-- Test 3: If no admin users, set yourself as admin (replace with your email)
-- UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';

-- Test 4: After setting admin, verify the function returns true
-- SELECT public.is_admin(auth.uid()) as am_i_admin;
