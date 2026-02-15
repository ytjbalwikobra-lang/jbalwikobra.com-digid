-- ENSURE SYNC TRIGGER EXISTS - Create auth.users to public.users sync
-- 
-- ISSUE: The sync_auth_user_to_users_trigger that should sync new auth.users
-- to public.users is missing, causing Google OAuth signups to fail.
--
-- This migration:
-- 1. Ensures the sync function exists
-- 2. Recreates the trigger if missing
-- 3. Verifies trigger is working correctly
-- 4. Is idempotent (safe to run multiple times)

-- =============================================================================
-- 1. ENSURE SYNC FUNCTION EXISTS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_users()
RETURNS TRIGGER AS $$
BEGIN
    -- On auth user creation, create corresponding public.users record
    INSERT INTO public.users (
        auth_user_id,
        email,
        name,
        role,
        is_admin,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = COALESCE(EXCLUDED.name, users.name),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_auth_user_to_users() IS 
'Automatically creates a public.users record when a new auth.users record is created (e.g., Google OAuth signup). Syncs email, name from metadata, and sets default role.';

-- =============================================================================
-- 2. CREATE TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS sync_auth_user_to_users_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_to_users_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_auth_user_to_users();

-- =============================================================================
-- 3. VERIFICATION
-- =============================================================================

DO $$
DECLARE
    trigger_count INT;
    function_count INT;
BEGIN
    -- Check if function exists
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'sync_auth_user_to_users'
    AND n.nspname = 'public';

    IF function_count = 0 THEN
        RAISE EXCEPTION 'Function sync_auth_user_to_users is missing!';
    ELSE
        RAISE NOTICE 'Function sync_auth_user_to_users exists';
    END IF;

    -- Check if trigger exists
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'sync_auth_user_to_users_trigger'
    AND n.nspname = 'auth'
    AND c.relname = 'users';

    IF trigger_count = 0 THEN
        RAISE EXCEPTION 'Trigger sync_auth_user_to_users_trigger is missing!';
    ELSE
        RAISE NOTICE 'Trigger sync_auth_user_to_users_trigger is properly configured';
    END IF;

    -- Verify no old triggers remain
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created'
    AND n.nspname = 'auth'
    AND c.relname = 'users';

    IF trigger_count > 0 THEN
        RAISE WARNING 'Old trigger on_auth_user_created still exists and should be removed!';
    ELSE
        RAISE NOTICE 'No conflicting old triggers found';
    END IF;
END $$;
