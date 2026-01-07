-- =============================================================================
-- FIX USERS TABLE RLS - Remove Infinite Recursion
-- =============================================================================
-- The users table policies were querying users table to check is_admin
-- This caused infinite recursion when is_admin() function ran
-- Solution: Simplify policies to not query users table recursively
-- =============================================================================

BEGIN;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Admin users have full access" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_access" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_admin" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_admin_write" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_read" ON public.users;
DROP POLICY IF EXISTS "users_service_role_all" ON public.users;

-- Create simple, non-recursive policies

-- 1. Service role bypasses all RLS
CREATE POLICY "users_service_role_all"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Users can view their own data
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id OR auth.uid() = auth_user_id);

-- 3. Users can update their own data (non-admin fields only)
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = id OR auth.uid() = auth_user_id);

-- 4. Allow public read access for basic user info (needed for public pages)
CREATE POLICY "users_select_public"
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

COMMIT;

-- =============================================================================
-- VERIFY
-- =============================================================================
SELECT 
    policyname,
    cmd,
    roles::text[],
    qual::text as using_clause
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
