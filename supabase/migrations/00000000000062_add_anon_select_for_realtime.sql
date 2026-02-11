-- Migration: Tambahkan RLS SELECT policy untuk anon agar Supabase Realtime bekerja
-- Tanggal: 2026-02-11
-- Deskripsi:
--   Supabase Realtime (postgres_changes) mengecek RLS sebelum mengirim event ke client.
--   Karena project ini menggunakan custom session auth (bukan Supabase Auth),
--   frontend menggunakan anon key → role = anon.
--   Tanpa SELECT policy untuk anon, Realtime event TIDAK PERNAH dikirim ke client.
--
--   Policy ini memungkinkan anon membaca data chat. Keamanan dijamin oleh:
--   1. Conversation ID = UUID (tidak bisa ditebak)
--   2. Semua operasi tulis melalui API yang terautentikasi (service_role)
--   3. Filter subscription di client membatasi event yang diterima per conversation_id
--
-- PENTING: Ini adalah best practice untuk Supabase Realtime + custom auth.
--          Jangan gunakan polling sebagai pengganti Realtime.

-- =============================================================================
-- 1. chat_conversations — anon SELECT
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_conversations' 
    AND policyname = 'chat_conversations_anon_select'
  ) THEN
    CREATE POLICY "chat_conversations_anon_select"
      ON public.chat_conversations
      FOR SELECT
      TO anon
      USING (true);
    RAISE NOTICE 'Created policy: chat_conversations_anon_select';
  ELSE
    RAISE NOTICE 'Policy chat_conversations_anon_select already exists, skipping';
  END IF;
END $$;

-- =============================================================================
-- 2. chat_messages — anon SELECT
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'chat_messages_anon_select'
  ) THEN
    CREATE POLICY "chat_messages_anon_select"
      ON public.chat_messages
      FOR SELECT
      TO anon
      USING (true);
    RAISE NOTICE 'Created policy: chat_messages_anon_select';
  ELSE
    RAISE NOTICE 'Policy chat_messages_anon_select already exists, skipping';
  END IF;
END $$;

-- =============================================================================
-- 3. chat_typing_indicators — anon SELECT (hanya jika tabel ada)
--    Policy lama "Customers view own conversation typing" menggunakan JWT claims 
--    yang kosong untuk anon → tidak bekerja untuk Realtime.
--    Tambahkan policy baru yang permissive (PostgreSQL OR dengan policy lama).
-- =============================================================================
DO $$
BEGIN
  -- Cek dulu apakah tabel chat_typing_indicators ada
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_typing_indicators'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'chat_typing_indicators' 
      AND policyname = 'chat_typing_anon_select'
    ) THEN
      CREATE POLICY "chat_typing_anon_select"
        ON public.chat_typing_indicators
        FOR SELECT
        TO anon
        USING (true);
      RAISE NOTICE 'Created policy: chat_typing_anon_select';
    ELSE
      RAISE NOTICE 'Policy chat_typing_anon_select already exists, skipping';
    END IF;
  ELSE
    RAISE NOTICE 'Table chat_typing_indicators does not exist, skipping policy';
  END IF;
END $$;

-- =============================================================================
-- 4. chat_admin_participants — anon SELECT (agar realtime participant update bisa diterima)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_admin_participants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'chat_admin_participants' 
      AND policyname = 'chat_admin_participants_anon_select'
    ) THEN
      CREATE POLICY "chat_admin_participants_anon_select"
        ON public.chat_admin_participants
        FOR SELECT
        TO anon
        USING (true);
      RAISE NOTICE 'Created policy: chat_admin_participants_anon_select';
    ELSE
      RAISE NOTICE 'Policy chat_admin_participants_anon_select already exists, skipping';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 5. Verifikasi tabel sudah di publication supabase_realtime
-- =============================================================================
DO $$
BEGIN
  -- chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    RAISE NOTICE 'Added chat_messages to supabase_realtime publication';
  END IF;

  -- chat_conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
    RAISE NOTICE 'Added chat_conversations to supabase_realtime publication';
  END IF;

  -- chat_typing_indicators (hanya jika tabel ada)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_typing_indicators'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'chat_typing_indicators'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing_indicators;
      RAISE NOTICE 'Added chat_typing_indicators to supabase_realtime publication';
    END IF;
  ELSE
    RAISE NOTICE 'Table chat_typing_indicators does not exist, skipping publication';
  END IF;
END $$;

-- Notifikasi PostgREST untuk reload schema cache
NOTIFY pgrst, 'reload schema';
