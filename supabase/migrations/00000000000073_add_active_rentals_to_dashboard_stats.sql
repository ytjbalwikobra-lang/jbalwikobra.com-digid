-- Migrasi 073: Tambah activeRentals ke get_dashboard_stats RPC
-- Menghitung jumlah rental yang sedang aktif (active + expiring_soon)

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalOrders', (SELECT COUNT(*) FROM public.orders),
    'totalRevenue', (SELECT COALESCE(SUM(amount), 0) FROM public.orders WHERE status IN ('paid', 'completed')),
    'totalUsers', (SELECT COUNT(*) FROM public.users),
    'totalProducts', (SELECT COUNT(*) FROM public.products WHERE is_active = true),
    'pendingOrders', (SELECT COUNT(*) FROM public.orders WHERE status = 'pending'),
    'completedOrders', (SELECT COUNT(*) FROM public.orders WHERE status IN ('paid', 'completed')),
    'totalReviews', (SELECT COUNT(*) FROM public.reviews),
    'averageRating', (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM public.reviews),
    'totalFlashSales', (SELECT COUNT(*) FROM public.flash_sales),
    'activeFlashSales', (SELECT COUNT(*) FROM public.flash_sales WHERE is_active = true),
    'activeRentals', (SELECT COUNT(*) FROM public.orders WHERE order_type = 'rental' AND rental_status IN ('active', 'expiring_soon'))
  ) INTO result;
  RETURN result;
EXCEPTION WHEN undefined_table THEN
  SELECT json_build_object(
    'totalOrders', (SELECT COUNT(*) FROM public.orders),
    'totalRevenue', (SELECT COALESCE(SUM(amount), 0) FROM public.orders WHERE status IN ('paid', 'completed')),
    'totalUsers', (SELECT COUNT(*) FROM public.users),
    'totalProducts', (SELECT COUNT(*) FROM public.products WHERE is_active = true),
    'pendingOrders', (SELECT COUNT(*) FROM public.orders WHERE status = 'pending'),
    'completedOrders', (SELECT COUNT(*) FROM public.orders WHERE status IN ('paid', 'completed')),
    'totalReviews', 0,
    'averageRating', 0,
    'totalFlashSales', 0,
    'activeFlashSales', 0,
    'activeRentals', (SELECT COUNT(*) FROM public.orders WHERE order_type = 'rental' AND rental_status IN ('active', 'expiring_soon'))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_dashboard_stats() IS 'Semua dashboard stats dalam 1 RPC call — termasuk active rentals count';
