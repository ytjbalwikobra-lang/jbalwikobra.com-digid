-- =============================================================================
-- COMPLETE FIX FOR PRICE EDITING ISSUE
-- =============================================================================
-- This script:
-- 1. Adds auth_user_id column to users table (if missing)
-- 2. Creates/updates is_admin function to check users.is_admin
-- 3. Creates an admin user (if none exists)
-- 4. Tests the setup
-- =============================================================================

BEGIN;

-- 1. Add auth_user_id column to users table if it doesn't exist
-- =============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added auth_user_id column to users table';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists';
    END IF;
END $$;

-- 2. Sync existing users with auth.users
-- =============================================================================
-- Match users by email and set their auth_user_id
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.email = au.email 
AND u.auth_user_id IS NULL;

-- 3. Create or update is_admin function
-- =============================================================================
DROP FUNCTION IF EXISTS public.is_admin(uuid);

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
DECLARE
    user_is_admin boolean;
BEGIN
    -- Check users table by auth_user_id
    SELECT is_admin INTO user_is_admin
    FROM public.users
    WHERE auth_user_id = uid
    LIMIT 1;
    
    -- If found, return result
    IF FOUND THEN
        RETURN COALESCE(user_is_admin, false);
    END IF;
    
    -- Also check by id column (in case auth_user_id is not set)
    SELECT is_admin INTO user_is_admin
    FROM public.users
    WHERE id = uid
    LIMIT 1;
    
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

COMMENT ON FUNCTION public.is_admin(uuid) IS 
'Checks if a user is an admin by looking up their auth UID in the users table. Returns true if user has is_admin=true.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

-- 4. Ensure there's at least one admin user
-- =============================================================================
-- Check if any admin exists
DO $$
DECLARE
    admin_count INTEGER;
    first_user_id UUID;
    first_user_email TEXT;
BEGIN
    -- Count existing admins
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE is_admin = true;
    
    IF admin_count = 0 THEN
        RAISE NOTICE 'No admin users found. Creating admin user...';
        
        -- Try to find a user with specific emails
        SELECT id, email INTO first_user_id, first_user_email 
        FROM public.users 
        WHERE email IN ('admin@jbalwikobra.com', 'jbalwikobra@gmail.com', 'ytjbalwikobra@gmail.com')
        LIMIT 1;
        
        -- If no specific admin email found, use the oldest user
        IF first_user_id IS NULL THEN
            SELECT id, email INTO first_user_id, first_user_email 
            FROM public.users 
            WHERE email IS NOT NULL AND email != ''
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;
        
        -- Set as admin
        IF first_user_id IS NOT NULL THEN
            UPDATE public.users 
            SET is_admin = true 
            WHERE id = first_user_id;
            RAISE NOTICE 'Set user % (%) as admin', first_user_email, first_user_id;
        ELSE
            -- Create a new admin user if no users exist at all
            INSERT INTO public.users (email, name, is_admin, created_at)
            VALUES ('admin@jbalwikobra.com', 'Admin', true, NOW())
            ON CONFLICT (email) DO UPDATE SET is_admin = true;
            RAISE NOTICE 'Created new admin user: admin@jbalwikobra.com';
        END IF;
    ELSE
        RAISE NOTICE 'Found % existing admin user(s)', admin_count;
    END IF;
END $$;

-- 5. Verify the setup
-- =============================================================================
DO $$
DECLARE
    admin_rec RECORD;
    func_result BOOLEAN;
BEGIN
    RAISE NOTICE '=== VERIFICATION ===';
    
    -- Show admin users
    FOR admin_rec IN 
        SELECT id, email, name, is_admin, auth_user_id 
        FROM public.users 
        WHERE is_admin = true
        LIMIT 5
    LOOP
        RAISE NOTICE 'Admin user: % (%), auth_user_id: %', 
            admin_rec.email, 
            admin_rec.id,
            COALESCE(admin_rec.auth_user_id::text, 'NULL');
        
        -- Test function with this user's ID
        SELECT public.is_admin(admin_rec.id) INTO func_result;
        RAISE NOTICE '  is_admin(user.id) = %', func_result;
        
        -- Test function with auth_user_id if available
        IF admin_rec.auth_user_id IS NOT NULL THEN
            SELECT public.is_admin(admin_rec.auth_user_id) INTO func_result;
            RAISE NOTICE '  is_admin(user.auth_user_id) = %', func_result;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== END VERIFICATION ===';
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION: Manual steps (run these separately after migration)
-- =============================================================================

-- View all admin users
-- SELECT id, email, name, is_admin, auth_user_id, created_at 
-- FROM public.users 
-- WHERE is_admin = true;

-- To set a specific user as admin:
-- UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';

-- To test if a user can update products (as that user):
-- SELECT public.is_admin(auth.uid());
-- Should return true if you're logged in as admin
