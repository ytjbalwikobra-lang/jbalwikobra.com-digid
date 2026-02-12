-- ============================================================================
-- Migrasi: RPC Functions untuk Optimasi Egress
-- Tujuan: Mengurangi transfer data dari Supabase ke client/server
-- dengan memindahkan agregasi ke sisi database (server-side aggregation)
-- ============================================================================

-- 1. Fungsi: Hitung total revenue dari orders yang sudah dibayar
-- Menggantikan: SELECT amount FROM orders WHERE status IN ('paid','completed')
-- kemudian SUM di client — yang mengunduh SEMUA baris amount
CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0) FROM public.orders WHERE status IN ('paid', 'completed');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_total_revenue() IS 'Hitung total revenue dari orders paid/completed — server-side aggregation';

-- 2. Fungsi: Hitung rata-rata rating review
-- Menggantikan: SELECT rating FROM reviews → lalu AVG di client
CREATE OR REPLACE FUNCTION public.get_average_rating()
RETURNS TABLE(avg_rating NUMERIC, total_reviews BIGINT) AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
    COUNT(*) AS total_reviews
  FROM public.reviews;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_average_rating() IS 'Hitung rata-rata rating dan total review — server-side aggregation';

-- 3. Fungsi: Dashboard stats lengkap dalam satu panggilan
-- Menggantikan: 7+ query paralel + client-side reduce untuk revenue
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
    'activeFlashSales', (SELECT COUNT(*) FROM public.flash_sales WHERE is_active = true)
  ) INTO result;
  RETURN result;
EXCEPTION WHEN undefined_table THEN
  -- Jika tabel reviews/flash_sales belum ada
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
    'activeFlashSales', 0
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_dashboard_stats() IS 'Semua dashboard stats dalam 1 RPC call — menggantikan 7+ query terpisah';

-- 4. Fungsi: Time-series order per hari (agregasi di database)
-- Menggantikan: SELECT created_at, amount, status FROM orders WHERE ... → lalu bucket di client
CREATE OR REPLACE FUNCTION public.get_orders_time_series(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
  date TEXT,
  total_count BIGINT,
  revenue NUMERIC,
  pending_count BIGINT,
  completed_count BIGINT,
  cancelled_count BIGINT,
  paid_count BIGINT
) AS $$
  SELECT 
    to_char(created_at::date, 'YYYY-MM-DD') AS date,
    COUNT(*) AS total_count,
    COALESCE(SUM(CASE WHEN status IN ('paid', 'completed') THEN amount ELSE 0 END), 0) AS revenue,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
    COUNT(*) FILTER (WHERE status = 'paid') AS paid_count
  FROM public.orders
  WHERE created_at >= p_start_date AND created_at <= p_end_date
  GROUP BY created_at::date
  ORDER BY date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_orders_time_series(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Time-series order dengan agregasi per hari — mengurangi egress dari ribuan baris ke puluhan';

-- 5. Fungsi: Order status time-series (created vs completed per hari)
CREATE OR REPLACE FUNCTION public.get_order_status_time_series(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
  date TEXT,
  created_count BIGINT,
  completed_count BIGINT
) AS $$
  WITH created_counts AS (
    SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*) AS cnt
    FROM public.orders
    WHERE created_at >= p_start_date AND created_at < p_end_date
    GROUP BY created_at::date
  ),
  completed_counts AS (
    SELECT to_char(updated_at::date, 'YYYY-MM-DD') AS date, COUNT(*) AS cnt
    FROM public.orders
    WHERE status = 'completed' AND updated_at IS NOT NULL
      AND updated_at >= p_start_date AND updated_at < p_end_date
    GROUP BY updated_at::date
  )
  SELECT 
    COALESCE(c.date, co.date) AS date,
    COALESCE(c.cnt, 0) AS created_count,
    COALESCE(co.cnt, 0) AS completed_count
  FROM created_counts c
  FULL OUTER JOIN completed_counts co ON c.date = co.date
  ORDER BY date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_order_status_time_series(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Created vs completed per hari — server-side aggregation';

-- 6. Fungsi: Top products berdasarkan revenue (agregasi di database)
-- Menggantikan: SELECT product_id, amount, status FROM orders WHERE ... → lalu aggregate + lookup product names di client
CREATE OR REPLACE FUNCTION public.get_top_products(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  order_count BIGINT,
  revenue NUMERIC
) AS $$
  SELECT 
    o.product_id,
    COALESCE(p.name, 'Produk') AS product_name,
    COUNT(*) AS order_count,
    COALESCE(SUM(CASE WHEN o.status IN ('paid', 'completed') THEN o.amount ELSE 0 END), 0) AS revenue
  FROM public.orders o
  LEFT JOIN public.products p ON p.id = o.product_id
  WHERE o.created_at >= p_start_date AND o.created_at <= p_end_date
    AND o.product_id IS NOT NULL
  GROUP BY o.product_id, p.name
  ORDER BY revenue DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT) IS 'Top products by revenue — menggantikan 2 query + client-side aggregation';

-- 7. Fungsi: Product stats (total, active, sold channels, value)
-- Menggantikan: SELECT price, is_active, archived_at, sold_channel FROM products → lalu hitung di client
CREATE OR REPLACE FUNCTION public.get_product_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE is_active = true AND sold_channel IS NULL),
    'soldViaWeb', COUNT(*) FILTER (WHERE sold_channel = 'web'),
    'soldViaWA', COUNT(*) FILTER (WHERE sold_channel = 'wa'),
    'totalValue', COALESCE(SUM(price), 0),
    'activeValue', COALESCE(SUM(price) FILTER (WHERE is_active = true AND sold_channel IS NULL), 0)
  )
  FROM public.products;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_product_stats() IS 'Statistik produk dalam 1 RPC call — menggantikan SELECT semua baris + client-side filtering';

-- Grant akses ke service role dan anon (supaya bisa dipanggil dari API dan frontend)
GRANT EXECUTE ON FUNCTION public.get_total_revenue() TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_average_rating() TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_orders_time_series(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_order_status_time_series(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_top_products(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_product_stats() TO service_role, anon;
