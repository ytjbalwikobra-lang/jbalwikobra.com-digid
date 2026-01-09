-- =============================================================================
-- FIX is_admin FUNCTION - NO DROP (for when policies depend on it)
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- This replaces the function WITHOUT dropping it first
-- =============================================================================

BEGIN;

-- Replace the function (don't drop it since policies depend on it)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
DECLARE
    user_is_admin boolean;
BEGIN
    -- Check users table (primary source)
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

-- Add helpful comment
COMMENT ON FUNCTION public.is_admin(uuid) IS 
'Checks if a user is an admin. Looks in users table first (primary), then profiles table (fallback).';

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

COMMIT;

-- =============================================================================
-- VERIFICATION - Run after the above succeeds
-- =============================================================================

-- Test 1: Check if you're admin
SELECT public.is_admin(auth.uid()) as am_i_admin;

-- Test 2: List all admin users
SELECT 
    email,
    is_admin,
    auth_user_id,
    public.is_admin(auth_user_id) as function_result
FROM public.users 
WHERE is_admin = true;

-- Test 3: If no admin users found, set yourself as admin (replace email)
-- UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';
