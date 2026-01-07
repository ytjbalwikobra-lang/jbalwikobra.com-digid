-- =============================================================================
-- DEBUG: Check if logged-in user is recognized as admin
-- =============================================================================
-- Run this while logged in as admin in your browser
-- =============================================================================

-- 1. Check your current authentication
SELECT 
    auth.uid() as your_user_id,
    auth.email() as your_email,
    auth.role() as your_role;

-- 2. Check if you exist in users table
SELECT 
    id,
    email,
    is_admin,
    auth_user_id,
    'Exists in users table' as status
FROM public.users
WHERE auth_user_id = auth.uid() OR id = auth.uid();

-- 3. Test is_admin function with your current session
SELECT 
    public.is_admin(auth.uid()) as am_i_admin,
    auth.uid() as my_auth_id;

-- 4. Check admin users and their auth_user_id
SELECT 
    id,
    email,
    is_admin,
    auth_user_id,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN '✓ Linked to auth'
        ELSE '✗ NOT linked'
    END as link_status
FROM public.users
WHERE is_admin = true;

-- =============================================================================
-- If is_admin returns FALSE, run this to fix:
-- =============================================================================
-- Make sure admin@jbalwikobra.com is properly linked
UPDATE public.users 
SET auth_user_id = (
    SELECT id FROM auth.users WHERE email = 'admin@jbalwikobra.com'
)
WHERE email = 'admin@jbalwikobra.com'
AND auth_user_id IS NULL;

-- Then verify again:
-- SELECT public.is_admin(auth.uid()) as am_i_admin;
