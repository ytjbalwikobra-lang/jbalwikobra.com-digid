-- =============================================================================
-- VERIFICATION QUERIES FOR PRICE EDITING FIX
-- =============================================================================
-- Run these queries in Supabase SQL Editor to verify the fix is working
-- =============================================================================

-- 1. Check if is_admin function exists and is using correct logic
-- =============================================================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'is_admin';

-- Expected: Should show function that checks users table


-- 2. Check if users table exists and has admin users
-- =============================================================================
SELECT 
    id,
    email,
    name,
    is_admin,
    auth_user_id,
    created_at
FROM public.users
WHERE is_admin = true
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show at least one admin user with is_admin = true


-- 3. Test is_admin function with your auth.uid()
-- =============================================================================
SELECT 
    auth.uid() as current_user_id,
    public.is_admin(auth.uid()) as am_i_admin,
    (SELECT email FROM public.users WHERE auth_user_id = auth.uid()) as my_email;

-- Expected: am_i_admin should be true if you're logged in as admin


-- 4. Test is_admin function for all admin users
-- =============================================================================
SELECT 
    u.email,
    u.is_admin as column_value,
    u.auth_user_id,
    public.is_admin(u.auth_user_id) as function_result_by_auth_id,
    public.is_admin(u.id) as function_result_by_id,
    CASE 
        WHEN public.is_admin(u.auth_user_id) = u.is_admin THEN '✓ MATCH'
        WHEN public.is_admin(u.id) = u.is_admin THEN '✓ MATCH (by id)'
        ELSE '✗ MISMATCH'
    END as status
FROM public.users u
WHERE u.is_admin = true;

-- Expected: All admin users should show ✓ MATCH


-- 5. Check products table RLS policies
-- =============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'products'
ORDER BY policyname;

-- Expected: Should see "Products admin modify" policy with is_admin check


-- 6. Test product update permission (DRY RUN - doesn't actually update)
-- =============================================================================
-- This simulates what happens when you try to update a product
SELECT 
    p.id,
    p.name,
    p.price,
    public.is_admin(auth.uid()) as can_i_edit,
    CASE 
        WHEN public.is_admin(auth.uid()) THEN 'You CAN edit products ✓'
        ELSE 'You CANNOT edit products ✗'
    END as permission_status
FROM public.products p
LIMIT 5;

-- Expected: can_i_edit should be true, permission_status should show "You CAN edit"


-- 7. Check for conflicting policies that might block updates
-- =============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'products'
AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;

-- Expected: Should only see service_role and admin modify policies


-- 8. Verify service_role policy exists (for API)
-- =============================================================================
SELECT COUNT(*) as service_role_policies
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'products'
AND policyname LIKE '%service_role%';

-- Expected: Should be >= 1


-- 9. Check if there are any users with auth_user_id = NULL
-- =============================================================================
SELECT 
    id,
    email,
    name,
    is_admin,
    auth_user_id,
    'Missing auth_user_id!' as warning
FROM public.users
WHERE is_admin = true
AND auth_user_id IS NULL;

-- Expected: Should return 0 rows (empty result)


-- 10. Full diagnostic: Check entire permission chain
-- =============================================================================
WITH current_user AS (
    SELECT 
        auth.uid() as user_id,
        (SELECT email FROM public.users WHERE auth_user_id = auth.uid()) as email,
        (SELECT is_admin FROM public.users WHERE auth_user_id = auth.uid()) as is_admin_column,
        public.is_admin(auth.uid()) as is_admin_function
)
SELECT 
    'Current User' as check_type,
    user_id::text as value,
    CASE 
        WHEN user_id IS NULL THEN '✗ Not logged in'
        ELSE '✓ Logged in'
    END as status
FROM current_user
UNION ALL
SELECT 
    'Email',
    email,
    CASE 
        WHEN email IS NULL THEN '✗ No email found'
        ELSE '✓ Email found'
    END
FROM current_user
UNION ALL
SELECT 
    'is_admin column',
    is_admin_column::text,
    CASE 
        WHEN is_admin_column = true THEN '✓ Admin in users table'
        ELSE '✗ Not admin in users table'
    END
FROM current_user
UNION ALL
SELECT 
    'is_admin() function',
    is_admin_function::text,
    CASE 
        WHEN is_admin_function = true THEN '✓ Function returns true'
        ELSE '✗ Function returns false'
    END
FROM current_user;

-- Expected: All checks should show ✓


-- =============================================================================
-- TROUBLESHOOTING QUERIES
-- =============================================================================

-- If is_admin function returns false, run this to check why:
-- =============================================================================
-- SELECT 
--     auth.uid() as my_auth_id,
--     u.*,
--     'Check if auth_user_id matches your auth.uid()' as note
-- FROM public.users u
-- WHERE u.auth_user_id = auth.uid() OR u.email = (SELECT email FROM auth.users WHERE id = auth.uid());


-- If you need to manually set a user as admin:
-- =============================================================================
-- UPDATE public.users 
-- SET is_admin = true, auth_user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
-- WHERE email = 'your-email@example.com';


-- If you need to sync auth_user_id for all users:
-- =============================================================================
-- UPDATE public.users u
-- SET auth_user_id = au.id
-- FROM auth.users au
-- WHERE u.email = au.email AND u.auth_user_id IS NULL;
