-- Migration: Tambah kolom role ke tabel users
-- Date: 2026-02-11
-- Description: Tambah kolom role untuk sistem multi-admin
-- PENTING: Dipisah dari fungsi validate_session karena supabase db push
--          memvalidasi SEMUA statement sebelum eksekusi (column harus ada dulu)

-- 1. Tambah kolom role
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. Set admin existing ke super_admin
DO $$
BEGIN
    EXECUTE 'UPDATE public.users SET role = $1 WHERE is_admin = TRUE AND (role IS NULL OR role = $2)'
    USING 'super_admin', 'user';
END $$;

-- 3. Index untuk query role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_role'
    ) THEN
        CREATE INDEX idx_users_role ON public.users(role);
    END IF;
END $$;
