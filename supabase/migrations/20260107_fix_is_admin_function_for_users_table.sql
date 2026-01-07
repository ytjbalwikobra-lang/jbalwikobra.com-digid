-- =============================================================================
-- FIX is_admin FUNCTION TO USE USERS TABLE INSTEAD OF PROFILES
-- =============================================================================
-- This migration fixes the is_admin() function to check the users table
-- instead of the profiles table. This is critical for RLS policies on
-- products, flash_sales, and other admin-managed tables.
--
-- ISSUE: The is_admin function was checking profiles table, but the system
--        uses a users table with is_admin boolean column
-- =============================================================================

BEGIN;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Create updated is_admin function that checks users table
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
DECLARE
    user_is_admin boolean;
BEGIN
    -- First check users table (primary source)
    SELECT is_admin INTO user_is_admin
    FROM public.users
    WHERE auth_user_id = uid OR id = uid
    LIMIT 1;
    
    -- If found in users table, return result
    IF FOUND THEN
        RETURN COALESCE(user_is_admin, false);
    END IF;
    
    -- Fallback to profiles table for backward compatibility
    SELECT (role IN ('admin', 'superadmin', 'super-admin', 'owner')) INTO user_is_admin
    FROM public.profiles
    WHERE id = uid
    LIMIT 1;
    
    RETURN COALESCE(user_is_admin, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin(uuid) IS 
'Checks if a user is an admin by looking up their auth UID in the users table (primary) or profiles table (fallback). Returns true if user has is_admin=true in users table or role in (admin, superadmin, super-admin, owner) in profiles table.';

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERY (run separately to test)
-- =============================================================================
-- SELECT 
--     u.email,
--     u.is_admin,
--     public.is_admin(u.auth_user_id) as function_result
-- FROM public.users u
-- WHERE u.is_admin = true
-- LIMIT 5;
