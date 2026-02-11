-- Migration: Update validate_session untuk return role
-- Date: 2026-02-11
-- Description: Update fungsi validate_session agar mengembalikan user_role
-- PENTING: Migrasi ini HARUS dijalankan SETELAH 058 (kolom role sudah ada)

-- Drop SEMUA overload validate_session yang mungkin ada
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

CREATE OR REPLACE FUNCTION public.validate_session(
    p_session_token VARCHAR(64)
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    user_email VARCHAR,
    user_name VARCHAR,
    is_admin BOOLEAN,
    user_role VARCHAR,
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
        u.created_at
    INTO v_session
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.session_token = p_session_token
    AND s.is_active = TRUE;
    
    -- Session tidak ditemukan
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::VARCHAR, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Cek apakah expired
    IF v_session.expires_at < NOW() THEN
        UPDATE user_sessions 
        SET is_active = FALSE, invalidated_at = NOW()
        WHERE session_token = p_session_token;
        
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::VARCHAR, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Cek apakah user aktif
    IF NOT v_session.user_active THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, FALSE, NULL::VARCHAR, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Update last activity
    UPDATE user_sessions 
    SET last_activity = NOW()
    WHERE session_token = p_session_token;
    
    -- Return session valid dengan role
    RETURN QUERY SELECT 
        TRUE,
        v_session.user_id,
        v_session.email,
        v_session.name,
        v_session.is_admin,
        v_session.role,
        v_session.expires_at,
        v_session.created_at;
END;
$$;

COMMENT ON FUNCTION public.validate_session(VARCHAR(64)) IS 'Validasi session dan return user info termasuk role dan created_at';
