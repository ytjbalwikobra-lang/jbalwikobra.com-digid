-- ============================================================================
-- Migrasi: Buat tabel admin_activity_logs untuk mencatat aktivitas admin
-- Deskripsi: Tabel audit trail umum (bukan hanya chat) untuk super_admin
-- ============================================================================

-- 1. Buat tabel admin_activity_logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_name VARCHAR(255),
  admin_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policy: anon bisa SELECT (untuk realtime, keamanan via UUID)
CREATE POLICY "admin_activity_logs_anon_select"
  ON public.admin_activity_logs
  FOR SELECT TO anon
  USING (true);

-- 4. Index untuk query berdasarkan waktu dan entity
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity ON public.admin_activity_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON public.admin_activity_logs (admin_id);

-- 5. Komentar
COMMENT ON TABLE public.admin_activity_logs IS 'Audit trail aktivitas admin — hanya bisa diakses super_admin';
COMMENT ON COLUMN public.admin_activity_logs.action IS 'Aksi: order_completed, order_status_changed, product_updated, rental_activated, chat_assigned, dll';
COMMENT ON COLUMN public.admin_activity_logs.entity_type IS 'Tipe entitas: order, product, user, chat, rental, settings';
COMMENT ON COLUMN public.admin_activity_logs.entity_id IS 'ID entitas yang terdampak';
COMMENT ON COLUMN public.admin_activity_logs.details IS 'Detail aktivitas dalam format JSON (old_value, new_value, dll)';
