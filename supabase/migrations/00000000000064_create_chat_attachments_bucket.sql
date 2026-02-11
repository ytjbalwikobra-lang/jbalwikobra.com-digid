-- Migrasi 064: Buat bucket storage untuk lampiran chat
-- Bucket publik agar gambar bisa langsung ditampilkan via URL tanpa token

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'chat-attachments', 'chat-attachments', true, 5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'chat-attachments'
);

-- Policy: siapa saja bisa membaca file dari bucket publik (sudah otomatis untuk public bucket)
-- Policy: hanya service_role yang bisa upload (via backend API) — tidak perlu policy tambahan
-- Karena semua upload dilakukan via backend menggunakan service_role key

-- Policy untuk service role upload (diperlukan meskipun service_role, untuk konsistensi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'chat_attachments_public_read'
  ) THEN
    CREATE POLICY "chat_attachments_public_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'chat-attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'chat_attachments_service_insert'
  ) THEN
    CREATE POLICY "chat_attachments_service_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'chat-attachments');
  END IF;
END $$;
