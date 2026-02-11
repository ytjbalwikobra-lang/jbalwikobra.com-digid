-- Add service_role policies to all admin-related tables
-- This ensures the admin API can access all necessary data when using service_role key

-- Notifications table - for admin notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
CREATE POLICY "notifications_service_role_all" ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "notifications_service_role_all" ON public.notifications IS 
'Allows service role to access notifications for admin dashboard.';

-- Payments table - for order payment information
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_service_role_all" ON public.payments;
CREATE POLICY "payments_service_role_all" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "payments_service_role_all" ON public.payments IS 
'Allows service role to access payment records for admin order management.';

-- Products table - for admin product management
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
CREATE POLICY "products_service_role_all" ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "products_service_role_all" ON public.products IS 
'Allows service role to access products for admin dashboard and product management.';

-- Reviews table - for admin review management
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_service_role_all" ON public.reviews;
CREATE POLICY "reviews_service_role_all" ON public.reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "reviews_service_role_all" ON public.reviews IS 
'Allows service role to access reviews for admin dashboard statistics.';

-- Flash sales table - for admin flash sales management
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flash_sales_service_role_all" ON public.flash_sales;
CREATE POLICY "flash_sales_service_role_all" ON public.flash_sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "flash_sales_service_role_all" ON public.flash_sales IS 
'Allows service role to access flash sales for admin dashboard statistics.';

-- Website settings table - for admin settings management
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "website_settings_service_role_all" ON public.website_settings;
CREATE POLICY "website_settings_service_role_all" ON public.website_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "website_settings_service_role_all" ON public.website_settings IS 
'Allows service role to access and update website settings from admin API.';
