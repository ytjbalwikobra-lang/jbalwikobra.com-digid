-- =============================================================================
-- URGENT: RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY
-- This adds missing columns to user_sessions table and updates validate_session
-- =============================================================================

-- 0. Add missing columns to existing user_sessions table
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;

-- Indexes for user_sessions (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
    ON public.user_sessions(session_token) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
    ON public.user_sessions(user_id, is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
    ON public.user_sessions(expires_at) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_active_expires 
    ON public.user_sessions(session_token, is_active, expires_at);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Service role policy
DROP POLICY IF EXISTS "user_sessions_service_role_all" ON public.user_sessions;
CREATE POLICY "user_sessions_service_role_all" ON public.user_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON public.user_sessions TO service_role;

-- 1. DROP existing function first (required when changing return type)
DROP FUNCTION IF EXISTS public.validate_session(VARCHAR);
DROP FUNCTION IF EXISTS public.validate_session(VARCHAR(64));
DROP FUNCTION IF EXISTS public.validate_session(TEXT);

-- 2. Create validate_session function
CREATE OR REPLACE FUNCTION public.validate_session(
    p_session_token TEXT
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
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
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if expired
    IF v_session.expires_at < NOW() THEN
        -- Auto-invalidate expired session
        UPDATE user_sessions 
        SET is_active = FALSE, invalidated_at = NOW()
        WHERE session_token = p_session_token;
        
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if user is active
    IF NOT v_session.user_active THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
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
        v_session.email::TEXT,
        v_session.name::TEXT,
        v_session.is_admin,
        v_session.expires_at;
END;
$$;

COMMENT ON FUNCTION public.validate_session IS 'Validates session and returns user info in one call - reduces API roundtrips';

-- 2. Grant permission to service_role
GRANT EXECUTE ON FUNCTION public.validate_session TO service_role;

-- 3. Verify it works
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'validate_session';
