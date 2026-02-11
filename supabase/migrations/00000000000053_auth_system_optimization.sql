-- =============================================================================
-- AUTH SYSTEM OPTIMIZATION - Database Layer
-- Created: 2026-01-20
-- Purpose: Optimize authentication with database-level improvements
-- =============================================================================
-- Features:
-- 1. Create optimized user_sessions table with indexes
-- 2. Create phone_verifications table with automatic cleanup
-- 3. Add database functions for session management
-- 4. Add triggers for automatic cleanup of expired data
-- 5. Create materialized views for analytics
-- 6. Add composite indexes for query optimization
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CREATE OPTIMIZED USER_SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45), -- Support IPv6
    user_agent TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT valid_token_length CHECK (length(session_token) = 64)
);

-- Indexes for optimal query performance (ISO 27001: Fast auth checks)
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
    ON public.user_sessions(session_token) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
    ON public.user_sessions(user_id, is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
    ON public.user_sessions(expires_at) 
    WHERE is_active = TRUE;

-- Composite index for most common query pattern
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_active_expires 
    ON public.user_sessions(session_token, is_active, expires_at);

-- Partial index for active sessions only (reduces index size by ~80%)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_last_activity 
    ON public.user_sessions(user_id, last_activity DESC) 
    WHERE is_active = TRUE;

-- Comment
COMMENT ON TABLE public.user_sessions IS 'User authentication sessions with automatic cleanup';
COMMENT ON COLUMN public.user_sessions.session_token IS '64-char hex token (32 bytes)';
COMMENT ON COLUMN public.user_sessions.device_info IS 'Device fingerprint for security monitoring';

-- =============================================================================
-- 2. CREATE PHONE_VERIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT valid_phone CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT valid_code CHECK (verification_code ~ '^[0-9]{6}$'),
    CONSTRAINT valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT max_attempts CHECK (attempts <= 5)
);

-- Indexes for verification lookup
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_unused 
    ON public.phone_verifications(user_id, is_used) 
    WHERE is_used = FALSE;

CREATE INDEX IF NOT EXISTS idx_phone_verifications_code_expires 
    ON public.phone_verifications(verification_code, expires_at) 
    WHERE is_used = FALSE;

CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires 
    ON public.phone_verifications(expires_at) 
    WHERE is_used = FALSE;

-- Partial index for active verifications only
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_code 
    ON public.phone_verifications(user_id, verification_code) 
    WHERE is_used = FALSE AND expires_at > NOW();

COMMENT ON TABLE public.phone_verifications IS 'Phone verification codes with auto-expiry';

-- =============================================================================
-- 3. ENABLE RLS (Row Level Security)
-- =============================================================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_sessions_service_role_all" ON public.user_sessions;
DROP POLICY IF EXISTS "phone_verifications_service_role_all" ON public.phone_verifications;

-- Service role has full access (for API backend)
CREATE POLICY "user_sessions_service_role_all" ON public.user_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "phone_verifications_service_role_all" ON public.phone_verifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view their own sessions
CREATE POLICY "user_sessions_users_read_own" ON public.user_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can invalidate their own sessions
CREATE POLICY "user_sessions_users_invalidate_own" ON public.user_sessions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() AND is_active = FALSE);

-- =============================================================================
-- 4. DATABASE FUNCTIONS FOR SESSION MANAGEMENT
-- =============================================================================

-- Function: Validate and get session info (reduces API calls)
CREATE OR REPLACE FUNCTION public.validate_session(
    p_session_token VARCHAR(64)
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    user_email VARCHAR,
    user_name VARCHAR,
    is_admin BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Get session with user info in single query
    SELECT 
        s.user_id,
        s.expires_at,
        s.is_active,
        u.email,
        u.name,
        u.is_admin,
        u.is_active AS user_active
    INTO v_session
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.session_token = p_session_token
    AND s.is_active = TRUE;
    
    -- Check if session exists and is valid
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if expired
    IF v_session.expires_at < NOW() THEN
        -- Auto-invalidate expired session
        UPDATE user_sessions 
        SET is_active = FALSE, invalidated_at = NOW()
        WHERE session_token = p_session_token;
        
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if user is active
    IF NOT v_session.user_active THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Update last activity
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE session_token = p_session_token;
    
    -- Return valid session
    RETURN QUERY SELECT 
        TRUE,
        v_session.user_id,
        v_session.email,
        v_session.name,
        v_session.is_admin,
        v_session.expires_at;
END;
$$;

COMMENT ON FUNCTION public.validate_session IS 'Validates session and returns user info in one call - reduces API roundtrips';

-- Function: Clean up expired sessions (called by cron or trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Soft delete expired sessions (keep for audit)
    UPDATE user_sessions
    SET is_active = FALSE, invalidated_at = NOW()
    WHERE is_active = TRUE 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Hard delete very old sessions (>90 days old)
    DELETE FROM user_sessions
    WHERE invalidated_at < NOW() - INTERVAL '90 days'
    OR (expires_at < NOW() - INTERVAL '90 days' AND is_active = FALSE);
    
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Cleans up expired sessions - run via cron job';

-- Function: Clean up expired verifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete expired verifications (>24 hours old)
    DELETE FROM phone_verifications
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- Function: Get active session count per user (security monitoring)
CREATE OR REPLACE FUNCTION public.get_user_session_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_sessions
    WHERE user_id = p_user_id
    AND is_active = TRUE
    AND expires_at > NOW();
    
    RETURN v_count;
END;
$$;

-- Function: Invalidate all sessions for a user (security feature)
CREATE OR REPLACE FUNCTION public.invalidate_all_user_sessions(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE user_sessions
    SET is_active = FALSE, invalidated_at = NOW()
    WHERE user_id = p_user_id
    AND is_active = TRUE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$$;

-- =============================================================================
-- 5. TRIGGERS FOR AUTOMATIC CLEANUP
-- =============================================================================

-- Auto-cleanup trigger for sessions (runs on INSERT)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up old sessions for this user (keep only last 10 active)
    UPDATE user_sessions
    SET is_active = FALSE, invalidated_at = NOW()
    WHERE id IN (
        SELECT id 
        FROM user_sessions
        WHERE user_id = NEW.user_id
        AND is_active = TRUE
        AND id != NEW.id
        ORDER BY created_at DESC
        OFFSET 10
    );
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_old_sessions ON public.user_sessions;
CREATE TRIGGER trigger_cleanup_old_sessions
    AFTER INSERT ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_cleanup_old_sessions();

-- Auto-cleanup trigger for verifications (delete old codes)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_verifications()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete old verification codes for this user
    DELETE FROM phone_verifications
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND (is_used = TRUE OR expires_at < NOW());
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_old_verifications ON public.phone_verifications;
CREATE TRIGGER trigger_cleanup_old_verifications
    AFTER INSERT ON public.phone_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_cleanup_old_verifications();

-- =============================================================================
-- 6. ADD MISSING COLUMNS TO ALL TABLES
-- =============================================================================

-- Add missing columns to user_sessions table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions' 
        AND column_name = 'last_activity'
    ) THEN
        ALTER TABLE public.user_sessions ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.user_sessions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions' 
        AND column_name = 'invalidated_at'
    ) THEN
        ALTER TABLE public.user_sessions ADD COLUMN invalidated_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE public.user_sessions ADD COLUMN ip_address VARCHAR(45);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE public.user_sessions ADD COLUMN user_agent TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions' 
        AND column_name = 'device_info'
    ) THEN
        ALTER TABLE public.user_sessions ADD COLUMN device_info JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add missing columns to phone_verifications table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE public.phone_verifications ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications' 
        AND column_name = 'is_used'
    ) THEN
        ALTER TABLE public.phone_verifications ADD COLUMN is_used BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications' 
        AND column_name = 'attempts'
    ) THEN
        ALTER TABLE public.phone_verifications ADD COLUMN attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE public.phone_verifications ADD COLUMN ip_address VARCHAR(45);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE public.phone_verifications ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Add password_hash column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE public.users ADD COLUMN password_hash VARCHAR(255);
    END IF;
END $$;

-- Add phone_verified column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'phone_verified'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add phone_verified_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'phone_verified_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add profile_completed column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'profile_completed'
    ) THEN
        ALTER TABLE public.users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add profile_completed_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'profile_completed_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN profile_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add last_login_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create additional indexes on users table for auth operations
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON public.users(phone_verified) WHERE phone_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login_at DESC NULLS LAST);

-- Composite index for login queries
CREATE INDEX IF NOT EXISTS idx_users_email_active 
    ON public.users(email, is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_phone_active 
    ON public.users(phone, is_active) 
    WHERE is_active = TRUE AND phone IS NOT NULL;

-- =============================================================================
-- 7. CREATE ANALYTICS VIEW FOR SESSION MONITORING
-- =============================================================================

-- Materialized view for session analytics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.session_analytics AS
SELECT 
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS sessions_created,
    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_sessions,
    COUNT(DISTINCT user_id) AS unique_users,
    AVG(EXTRACT(EPOCH FROM (COALESCE(invalidated_at, NOW()) - created_at))) AS avg_session_duration_seconds
FROM public.user_sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_analytics_hour 
    ON public.session_analytics(hour);

COMMENT ON MATERIALIZED VIEW public.session_analytics IS 'Hourly session statistics - refresh every hour';

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION public.refresh_session_analytics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.session_analytics;
END;
$$;

-- =============================================================================
-- 8. GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to service_role
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.phone_verifications TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_session TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verifications TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_session_count TO service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_all_user_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_session_analytics TO service_role;
GRANT SELECT ON public.session_analytics TO service_role;

-- =============================================================================
-- COMMIT
-- =============================================================================

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- =============================================================================

-- Verify tables created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_sessions', 'phone_verifications');

-- Verify indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('user_sessions', 'phone_verifications');

-- Verify functions
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%session%';

-- Test session validation
-- SELECT * FROM public.validate_session('test_token_here');

-- Check session analytics
-- SELECT * FROM public.session_analytics LIMIT 10;
