-- FIX PROFILES TABLE REFERENCES - Drop old trigger and function
-- 
-- ISSUE: The old trigger "on_auth_user_created" with function "handle_new_user()"
-- tries to INSERT INTO public.profiles when a new user signs up via Google OAuth.
-- However, the profiles table no longer exists (migrated to users in migration 041).
-- This causes "relation public.profiles does not exist" errors.
--
-- Migration 041 created a NEW trigger but never dropped the OLD one, so both triggers
-- were running simultaneously causing conflicts.
--
-- This migration:
-- 1. Drops the old trigger and function that reference profiles
-- 2. Ensures only the correct sync_auth_user_to_users trigger remains
-- 3. Is idempotent (safe to run multiple times)

-- =============================================================================
-- 1. DROP OLD TRIGGER THAT INSERTS INTO PROFILES
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =============================================================================
-- 2. DROP OLD FUNCTION THAT REFERENCES PROFILES
-- =============================================================================

DROP FUNCTION IF EXISTS public.handle_new_user();

-- =============================================================================
-- 3. VERIFICATION
-- =============================================================================

DO $$
DECLARE
    trigger_count INT;
BEGIN
    -- Check if the old trigger still exists
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'on_auth_user_created'
    AND n.nspname = 'auth'
    AND c.relname = 'users';

    IF trigger_count > 0 THEN
        RAISE WARNING 'Old trigger on_auth_user_created still exists!';
    ELSE
        RAISE NOTICE 'Successfully removed old profiles trigger';
    END IF;

    -- Verify the correct trigger exists
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'sync_auth_user_to_users_trigger'
    AND n.nspname = 'auth'
    AND c.relname = 'users';

    IF trigger_count = 0 THEN
        RAISE WARNING 'Correct trigger sync_auth_user_to_users_trigger is missing!';
    ELSE
        RAISE NOTICE 'Correct users sync trigger is present';
    END IF;
END $$;
