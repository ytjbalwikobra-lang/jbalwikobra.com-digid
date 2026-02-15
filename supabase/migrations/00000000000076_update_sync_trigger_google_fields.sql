-- UPDATE SYNC TRIGGER - Add Google OAuth fields
-- 
-- ISSUE: The sync_auth_user_to_users trigger doesn't set google_id, avatar_url,
-- and auth_provider fields that are needed for Google OAuth users.
--
-- This migration:
-- 1. Updates the sync function to include all Google OAuth fields
-- 2. Ensures consistency between trigger-created and API-created users
-- 3. Is idempotent (safe to run multiple times)

-- =============================================================================
-- UPDATE SYNC FUNCTION WITH ALL GOOGLE OAUTH FIELDS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_users()
RETURNS TRIGGER AS $$
DECLARE
    provider_name TEXT;
BEGIN
    -- Determine auth provider from metadata or email
    provider_name := COALESCE(
        NEW.raw_app_meta_data->>'provider',
        CASE 
            WHEN NEW.email LIKE '%@gmail.com' THEN 'google'
            ELSE 'email'
        END
    );

    -- On auth user creation, create corresponding public.users record
    INSERT INTO public.users (
        auth_user_id,
        email,
        name,
        avatar_url,
        google_id,
        auth_provider,
        role,
        is_admin,
        is_active,
        phone_verified,
        profile_completed,
        created_at
    ) VALUES (
        NEW.id,                                                                   -- auth_user_id
        NEW.email,                                                                -- email
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name', 
            SPLIT_PART(NEW.email, '@', 1)
        ),                                                                        -- name
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url', 
            NEW.raw_user_meta_data->>'picture'
        ),                                                                        -- avatar_url
        CASE WHEN provider_name = 'google' THEN NEW.id ELSE NULL END,            -- google_id
        provider_name,                                                            -- auth_provider
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),                       -- role
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE),        -- is_admin
        TRUE,                                                                     -- is_active
        FALSE,                                                                    -- phone_verified
        TRUE,                                                                     -- profile_completed (Google users)
        NOW()                                                                     -- created_at
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = COALESCE(EXCLUDED.name, users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        google_id = COALESCE(EXCLUDED.google_id, users.google_id),
        auth_provider = EXCLUDED.auth_provider,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_auth_user_to_users() IS 
'Automatically creates a public.users record when a new auth.users record is created (e.g., Google OAuth signup). 
Syncs email, name, avatar_url, google_id, auth_provider from metadata, and sets defaults for other fields.
Updated 2026-02-15 to include all Google OAuth fields.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Sync function updated successfully with Google OAuth fields (google_id, avatar_url, auth_provider)';
END $$;
