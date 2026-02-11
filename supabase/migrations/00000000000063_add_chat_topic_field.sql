-- Migration: Tambah kolom topic pada chat_conversations
-- Tanggal: 2026-02-11
-- Deskripsi: 
--   Menambahkan kolom topic untuk klasifikasi percakapan chat.
--   Topic menentukan field tambahan di form chat pelanggan:
--   - 'pembelian_rental': Menampilkan input Order ID
--   - 'jual_akun': Menampilkan game selector
--   - 'lainnya': Hanya subject biasa

-- =============================================================================
-- 1. Tambah kolom topic
-- =============================================================================
ALTER TABLE public.chat_conversations 
  ADD COLUMN IF NOT EXISTS topic VARCHAR(50) DEFAULT 'lainnya';

-- =============================================================================
-- 2. Tambah kolom game_title untuk topik "jual_akun"
-- =============================================================================
ALTER TABLE public.chat_conversations 
  ADD COLUMN IF NOT EXISTS game_title VARCHAR(255);

-- =============================================================================
-- 3. Index untuk filter topic
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_chat_conversations_topic 
  ON public.chat_conversations(topic);

-- =============================================================================
-- 4. Notifikasi PostgREST untuk reload schema cache
-- =============================================================================
NOTIFY pgrst, 'reload schema';
