-- Migration: Buat ulang chat_canned_responses dan fix akses
-- Migrasi 057 tercatat sukses tapi tabel TIDAK ada di database
-- Kemungkinan uuid_generate_v4() gagal saat eksekusi
-- Gunakan gen_random_uuid() sebagai pengganti

-- 1. Buat tabel (menggunakan gen_random_uuid yang built-in PostgreSQL 13+)
CREATE TABLE IF NOT EXISTS public.chat_canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100),
    shortcut VARCHAR(50) UNIQUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_canned_active ON public.chat_canned_responses(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_canned_category ON public.chat_canned_responses(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_canned_shortcut ON public.chat_canned_responses(shortcut) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_canned_usage ON public.chat_canned_responses(usage_count DESC);

-- 3. Enable RLS
ALTER TABLE public.chat_canned_responses ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "chat_canned_responses_service_role_all" ON public.chat_canned_responses;
CREATE POLICY "chat_canned_responses_service_role_all" ON public.chat_canned_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view canned responses" ON public.chat_canned_responses;
CREATE POLICY "Admins view canned responses" ON public.chat_canned_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- 5. Grants
GRANT ALL ON public.chat_canned_responses TO service_role;
GRANT SELECT ON public.chat_canned_responses TO authenticated;
GRANT SELECT ON public.chat_canned_responses TO anon;

-- 6. Insert default canned responses
INSERT INTO public.chat_canned_responses (title, message, category, shortcut, sort_order)
VALUES
  ('Salam Pembuka', 'Halo! Terima kasih sudah menghubungi JB Alwikobra. Ada yang bisa kami bantu?', 'greeting', '/hello', 1),
  ('Terima Kasih', 'Terima kasih atas kesabaran Anda. Apakah ada hal lain yang bisa kami bantu?', 'closing', '/thanks', 2),
  ('Cek Pesanan', 'Mohon berikan nomor pesanan Anda agar kami bisa mengecek statusnya.', 'faq', '/order', 3),
  ('Metode Pembayaran', 'Kami menerima pembayaran melalui transfer bank dan QRIS. Silakan pilih metode yang paling nyaman untuk Anda.', 'faq', '/payment', 4),
  ('Salam Penutup', 'Terima kasih telah menghubungi kami! Jika ada pertanyaan lain, jangan ragu untuk menghubungi kembali. Selamat berbelanja!', 'closing', '/bye', 5)
ON CONFLICT (shortcut) DO NOTHING;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
