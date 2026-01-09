-- =============================================================================
-- DEBUG: Find the mismatch between auth.uid() and users table
-- =============================================================================

-- Step 1: Check what auth.uid() returns (your current session)
SELECT 
    auth.uid() as my_auth_uid,
    auth.email() as my_auth_email;

-- Step 2: Check the admin user in users table
SELECT 
    id,
    email,
    name,
    is_admin,
    auth_user_id
FROM public.users 
WHERE email = 'admin@jbalwikobra.com';

-- Step 3: Check if they match
SELECT 
    auth.uid() as my_current_auth_id,
    u.auth_user_id as stored_auth_id,
    u.id as user_table_id,
    u.is_admin,
    (auth.uid() = u.auth_user_id) as auth_ids_match,
    (auth.uid() = u.id) as auth_matches_user_id
FROM public.users u
WHERE u.email = 'admin@jbalwikobra.com';

-- =============================================================================
-- SOLUTION: Once you see the results above, use ONE of these fixes:
-- =============================================================================

-- FIX 1: If auth_user_id is NULL or doesn't match, update it
-- UPDATE public.users 
-- SET auth_user_id = auth.uid(), is_admin = true 
-- WHERE email = 'admin@jbalwikobra.com';

-- FIX 2: If the id column matches auth.uid(), update is_admin by id
-- UPDATE public.users 
-- SET is_admin = true 
-- WHERE id = auth.uid();

-- FIX 3: If neither match, you might be logged in as a different user
-- List all users to find yourself:
-- SELECT id, email, name, is_admin, auth_user_id FROM public.users;

-- =============================================================================
-- AFTER APPLYING FIX, VERIFY:
-- =============================================================================

-- Should return true
SELECT public.is_admin(auth.uid()) as am_i_admin;

-- Should show your user as admin
SELECT 
    email,
    is_admin,
    auth_user_id,
    public.is_admin(auth_user_id) as function_test
FROM public.users 
WHERE email = 'admin@jbalwikobra.com';
