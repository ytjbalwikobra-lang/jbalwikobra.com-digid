-- Migration: Tambah kolom auth_provider ke tabel users
-- Date: 2026-02-15
-- Description: Mendukung multi-auth (Google OAuth + Email/Password)
--              Hapus ketergantungan WhatsApp verification

-- 1. Tambah kolom auth_provider
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';

-- 2. Tambah kolom avatar_url jika belum ada (untuk Google profile picture)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Tambah kolom google_id untuk linking Google account
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id TEXT;

-- 4. Set default auth_provider untuk user yang sudah ada
-- User yang sudah ada dengan phone_verified = true → 'phone' (legacy)
-- User lain → 'email'
DO $$ BEGIN
  EXECUTE 'UPDATE public.users SET auth_provider = ''phone'' WHERE phone_verified = true AND auth_provider = ''email''';
END $$;

-- 5. Buat index untuk google_id (unik, untuk lookup cepat)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id) WHERE google_id IS NOT NULL;

-- 6. Buat index untuk auth_provider (untuk analytics)
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users(auth_provider);

-- 7. Tambah comment
COMMENT ON COLUMN public.users.auth_provider IS 'Provider autentikasi: google, email, phone (legacy)';
COMMENT ON COLUMN public.users.google_id IS 'Google OAuth user ID untuk linking akun';
COMMENT ON COLUMN public.users.avatar_url IS 'URL avatar (dari Google profile atau upload)';
