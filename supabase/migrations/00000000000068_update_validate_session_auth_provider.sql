-- Migration: Update validate_session untuk return auth_provider
-- Date: 2026-02-15
-- Description: Tambah auth_provider ke return value validate_session
--              Dipisah dari migration 067 karena supabase db push memvalidasi 
--              semua statement sebelum eksekusi (kolom harus sudah ada)

-- Drop SEMUA overload validate_session
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc 
        WHERE proname = 'validate_session' 
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- Recreate dengan auth_provider
CREATE OR REPLACE FUNCTION public.validate_session(
    p_session_token VARCHAR(64)
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    is_admin BOOLEAN,
    user_role VARCHAR(50),
    expires_at TIMESTAMP WITH TIME ZONE,
    user_created_at TIMESTAMP WITH TIME ZONE,
    user_auth_provider VARCHAR(20),
    user_avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Ambil session + user info dalam satu query
    SELECT 
        s.user_id,
        s.expires_at,
        s.is_active,
        u.email,
        u.name,
        u.is_admin,
        u.role,
        u.is_active AS user_active,
        u.created_at,
        u.auth_provider,
        u.avatar_url
    INTO v_session
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.session_token = p_session_token
    AND s.is_active = TRUE;
    
    -- Session tidak ditemukan
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::VARCHAR(50), NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE, NULL::VARCHAR(20), NULL::TEXT;
        RETURN;
    END IF;
    
    -- Cek apakah expired
    IF v_session.expires_at < NOW() THEN
        UPDATE user_sessions 
        SET is_active = FALSE, invalidated_at = NOW()
        WHERE session_token = p_session_token;
        
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::VARCHAR(50), NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE, NULL::VARCHAR(20), NULL::TEXT;
        RETURN;
    END IF;
    
    -- Cek apakah user aktif
    IF NOT v_session.user_active THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::VARCHAR(50), NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE, NULL::VARCHAR(20), NULL::TEXT;
        RETURN;
    END IF;
    
    -- Update last activity
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE session_token = p_session_token;
    
    -- Return session valid dengan auth_provider dan avatar_url
    RETURN QUERY SELECT 
        TRUE,
        v_session.user_id,
        v_session.email::TEXT,
        v_session.name::TEXT,
        v_session.is_admin,
        v_session.role::VARCHAR(50),
        v_session.expires_at,
        v_session.created_at,
        v_session.auth_provider::VARCHAR(20),
        v_session.avatar_url::TEXT;
END;
$$;

COMMENT ON FUNCTION public.validate_session(VARCHAR(64)) IS 'Validasi session dan return user info termasuk role, auth_provider, avatar_url, dan created_at.';
