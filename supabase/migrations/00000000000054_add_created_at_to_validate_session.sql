-- Migration: Add created_at to validate_session function
-- Date: 2026-01-22
-- Description: Include user's created_at in validate_session response for "Member Since" display

-- Drop existing function first (signature changed)
DROP FUNCTION IF EXISTS public.validate_session(VARCHAR(64));

CREATE OR REPLACE FUNCTION public.validate_session(
    p_session_token VARCHAR(64)
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    user_email VARCHAR,
    user_name VARCHAR,
    is_admin BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    user_created_at TIMESTAMP WITH TIME ZONE
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
        u.is_active AS user_active,
        u.created_at
    INTO v_session
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.session_token = p_session_token
    AND s.is_active = TRUE;
    
    -- Check if session exists and is valid
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if expired
    IF v_session.expires_at < NOW() THEN
        -- Auto-invalidate expired session
        UPDATE user_sessions 
        SET is_active = FALSE, invalidated_at = NOW()
        WHERE session_token = p_session_token;
        
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if user is active
    IF NOT v_session.user_active THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Update last activity
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE session_token = p_session_token;
    
    -- Return valid session with created_at
    RETURN QUERY SELECT 
        TRUE,
        v_session.user_id,
        v_session.email,
        v_session.name,
        v_session.is_admin,
        v_session.expires_at,
        v_session.created_at;
END;
$$;

COMMENT ON FUNCTION public.validate_session IS 'Validates session and returns user info including created_at in one call';
