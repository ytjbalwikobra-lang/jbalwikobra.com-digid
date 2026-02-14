-- ============================================================================
-- Migrasi: Tambah kolom tracking rental pada tabel orders
-- Deskripsi: Menambahkan rental_start_date, rental_end_date, rental_status
--            untuk melacak akun yang sedang di-rental secara aktif
-- ============================================================================

-- 1. Tambah kolom rental_start_date — waktu admin konfirmasi selesai diproses
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rental_start_date TIMESTAMPTZ;

-- 2. Tambah kolom rental_end_date — waktu estimasi rental berakhir
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rental_end_date TIMESTAMPTZ;

-- 3. Tambah kolom rental_status — status lifecycle rental
-- Nilai: 'pending_activation' | 'active' | 'expiring_soon' | 'expired' | 'returned'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rental_status VARCHAR(30);

-- 4. Tambah kolom completed_by — admin yang mengkonfirmasi order selesai
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_by UUID;

-- 5. Tambah kolom completed_at — waktu admin mengkonfirmasi
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 6. Komentar kolom baru
COMMENT ON COLUMN public.orders.rental_start_date IS 'Tanggal mulai rental — diset saat admin klik Tandai Selesai';
COMMENT ON COLUMN public.orders.rental_end_date IS 'Tanggal estimasi rental berakhir — dihitung dari rental_duration';
COMMENT ON COLUMN public.orders.rental_status IS 'Status rental: pending_activation, active, expiring_soon, expired, returned';
COMMENT ON COLUMN public.orders.completed_by IS 'UUID admin yang mengkonfirmasi order selesai diproses';
COMMENT ON COLUMN public.orders.completed_at IS 'Waktu admin mengkonfirmasi order selesai diproses';

-- 7. Index untuk query rental aktif (digunakan oleh admin rental tracking page)
CREATE INDEX IF NOT EXISTS idx_orders_rental_status ON public.orders (rental_status) WHERE order_type = 'rental';
CREATE INDEX IF NOT EXISTS idx_orders_rental_end_date ON public.orders (rental_end_date) WHERE order_type = 'rental' AND rental_status = 'active';
