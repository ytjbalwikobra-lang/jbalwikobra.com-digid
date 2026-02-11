-- ===========================================================================
-- COMPLETE FIX FOR ADMIN PANEL EMPTY TABLES ISSUE
-- ===========================================================================
-- 
-- This script adds service_role policies to all admin-related tables to fix
-- the issue where the admin panel shows empty order and user tables.
--
-- AFFECTED TABLES:
-- - users (fixes circular dependency)
-- - orders (enables order list and revenue stats)
-- - products (enables product management)
-- - notifications (enables notification display)
-- - payments (enables payment information)
-- - reviews (enables review stats)
-- - flash_sales (enables flash sale stats)
-- - website_settings (enables settings management)
--
-- USAGE:
-- Copy this entire script and run it in Supabase SQL Editor
--
-- NOTE: We use explicit transaction (BEGIN/COMMIT) to ensure all-or-nothing
-- behavior. If any statement fails, the entire migration is rolled back.
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 1. USERS TABLE - Fix circular dependency
-- ===========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_service_role_all" ON public.users;
CREATE POLICY "users_service_role_all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "users_service_role_all" ON public.users IS 
'Allows service role to bypass RLS on users table. This prevents circular dependency where admin policies check users.is_admin but cannot access the users table itself.';

-- ===========================================================================
-- 2. ORDERS TABLE - Enable admin access to all orders
-- ===========================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_service_role_all" ON public.orders;
CREATE POLICY "orders_service_role_all" ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "orders_service_role_all" ON public.orders IS 
'Allows service role to bypass RLS on orders table. This enables the admin API to access all orders data for dashboard statistics and order management.';

-- ===========================================================================
-- 3. PRODUCTS TABLE - Enable admin product management
-- ===========================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
CREATE POLICY "products_service_role_all" ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "products_service_role_all" ON public.products IS 
'Allows service role to access products for admin dashboard and product management.';

-- ===========================================================================
-- 4. NOTIFICATIONS TABLE - Enable admin notifications
-- ===========================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
CREATE POLICY "notifications_service_role_all" ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "notifications_service_role_all" ON public.notifications IS 
'Allows service role to access notifications for admin dashboard.';

-- ===========================================================================
-- 5. PAYMENTS TABLE - Enable admin payment access
-- ===========================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_service_role_all" ON public.payments;
CREATE POLICY "payments_service_role_all" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "payments_service_role_all" ON public.payments IS 
'Allows service role to access payment records for admin order management.';

-- ===========================================================================
-- 6. REVIEWS TABLE - Enable admin review management
-- ===========================================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_service_role_all" ON public.reviews;
CREATE POLICY "reviews_service_role_all" ON public.reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "reviews_service_role_all" ON public.reviews IS 
'Allows service role to access reviews for admin dashboard statistics.';

-- ===========================================================================
-- 7. FLASH_SALES TABLE - Enable admin flash sales management
-- ===========================================================================
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flash_sales_service_role_all" ON public.flash_sales;
CREATE POLICY "flash_sales_service_role_all" ON public.flash_sales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "flash_sales_service_role_all" ON public.flash_sales IS 
'Allows service role to access flash sales for admin dashboard statistics.';

-- ===========================================================================
-- 8. WEBSITE_SETTINGS TABLE - Enable admin settings management
-- ===========================================================================
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "website_settings_service_role_all" ON public.website_settings;
CREATE POLICY "website_settings_service_role_all" ON public.website_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "website_settings_service_role_all" ON public.website_settings IS 
'Allows service role to access and update website settings from admin API.';

-- ===========================================================================
-- 9. AUTHENTICATED ADMIN POLICIES - For Frontend Access
-- ===========================================================================
-- The frontend adminService uses authenticated user sessions, not service role.
-- We need to add policies for authenticated admin users as well.

-- Users table - authenticated admin access
DROP POLICY IF EXISTS "users_authenticated_read" ON public.users;
CREATE POLICY "users_authenticated_read" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow admins to read all users
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
    -- OR allow users to read their own data
    OR auth.uid() = id
  );

DROP POLICY IF EXISTS "users_authenticated_admin_write" ON public.users;
CREATE POLICY "users_authenticated_admin_write" ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

COMMENT ON POLICY "users_authenticated_read" ON public.users IS 
'Allows authenticated admin users to read all user data, and regular users to read their own data.';

COMMENT ON POLICY "users_authenticated_admin_write" ON public.users IS 
'Allows authenticated admin users to manage all user data.';

-- Orders table - authenticated admin access
DROP POLICY IF EXISTS "orders_authenticated_admin_all" ON public.orders;
CREATE POLICY "orders_authenticated_admin_all" ON public.orders
  FOR ALL
  TO authenticated
  USING (
    -- Allow admins to access all orders
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
    -- OR allow users to access their own orders
    OR auth.uid() = user_id
  )
  WITH CHECK (
    -- Allow admins to manage all orders
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

COMMENT ON POLICY "orders_authenticated_admin_all" ON public.orders IS 
'Allows authenticated admin users to access and manage all orders, and regular users to access their own orders.';

-- ===========================================================================
-- VERIFICATION - Check that policies were created
-- ===========================================================================
SELECT 
  'SERVICE_ROLE POLICIES CREATED' as status,
  tablename,
  policyname,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users',
    'orders',
    'products',
    'notifications',
    'payments',
    'reviews',
    'flash_sales',
    'website_settings'
  )
  AND policyname LIKE '%service_role%'
ORDER BY tablename;

-- Check authenticated policies too
SELECT 
  'AUTHENTICATED POLICIES CREATED' as status,
  tablename,
  policyname,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'orders')
  AND policyname LIKE '%authenticated%'
ORDER BY tablename;

COMMIT;

-- ===========================================================================
-- SUCCESS!
-- ===========================================================================
-- 
-- All policies have been created for both service_role AND authenticated users.
-- The admin panel should now work correctly whether using:
-- - Backend API (with service_role key)
-- - Frontend direct queries (with authenticated user session)
--
-- The admin panel should now:
-- ✅ Display correct user count
-- ✅ Display correct order count
-- ✅ Display correct revenue statistics
-- ✅ Show paginated order list
-- ✅ Show paginated user list
-- ✅ Show product statistics
--
-- IMPORTANT: Make sure the admin user has is_admin = true in the users table!
-- ===========================================================================
