-- ============================================================================
-- Migrasi: Tambah support notification type 'expiring_rent'
-- Deskripsi: Menambahkan type 'expiring_rent' untuk notifikasi admin
--            ketika rental akan segera berakhir (status: expiring_soon)
-- ============================================================================

-- Komentar untuk dokumentasi — admin_notifications.type sudah TEXT
-- Tidak perlu ALTER TABLE karena type sudah TEXT (fleksibel)
-- Migration ini untuk dokumentasi dan konsistensi saja

COMMENT ON COLUMN public.admin_notifications.type IS 
'Notification type: new_order, paid_order, new_rent, paid_rent, expiring_rent, order_cancelled';

-- Index untuk query notifikasi expiring_rent (digunakan untuk filtering)
CREATE INDEX IF NOT EXISTS idx_admin_notifications_expiring_rent 
ON public.admin_notifications (created_at DESC) 
WHERE type = 'expiring_rent';

-- Komentar untuk dokumentasi metadata
COMMENT ON COLUMN public.admin_notifications.metadata IS 
'JSONB metadata: priority (normal|high), category (order|payment|expiring_rental), order_type (purchase|rental), customer_phone, original_order_id, rental_duration';
