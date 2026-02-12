-- Migrasi: Buat tabel chat_settings untuk pengaturan jam operasional chat
-- Tabel ini menyimpan konfigurasi jam kerja dan pesan di luar jam kerja

CREATE TABLE IF NOT EXISTS public.chat_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  -- Jam operasional chat (format 24 jam, WIB)
  business_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  business_hours_start TEXT NOT NULL DEFAULT '09:00',  -- Format HH:mm
  business_hours_end TEXT NOT NULL DEFAULT '23:00',    -- Format HH:mm
  business_hours_timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  -- Pesan yang ditampilkan di luar jam kerja
  offline_message TEXT NOT NULL DEFAULT 'Terima kasih telah menghubungi kami. Saat ini di luar jam operasional (23:00 - 09:00 WIB). Pesan Anda tetap kami terima dan akan dibalas paling lambat pukul 09:00 WIB. Terima kasih atas kesabarannya! 🙏',
  -- Nama/label yang ditampilkan
  offline_label TEXT NOT NULL DEFAULT 'Di Luar Jam Operasional',
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Aktifkan RLS
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

-- Policy: anon bisa baca (untuk widget pelanggan)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'chat_settings_anon_select' AND tablename = 'chat_settings'
  ) THEN
    CREATE POLICY chat_settings_anon_select ON public.chat_settings FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Policy: authenticated bisa baca
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'chat_settings_auth_select' AND tablename = 'chat_settings'
  ) THEN
    CREATE POLICY chat_settings_auth_select ON public.chat_settings FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Insert default row jika belum ada
INSERT INTO public.chat_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Komentar tabel
COMMENT ON TABLE public.chat_settings IS 'Pengaturan jam operasional chat dan pesan di luar jam kerja';
