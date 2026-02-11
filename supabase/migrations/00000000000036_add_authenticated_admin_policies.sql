-- Add authenticated admin user policies for users and orders tables
-- This allows authenticated admin users to access these tables from the frontend

-- ===========================================================================
-- 1. USERS TABLE - Add policy for authenticated admin users
-- ===========================================================================

-- Add policy for authenticated users to read all user data (admin check should be done in app)
-- This is needed because the frontend adminService uses authenticated user session
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

-- Add policy for authenticated admin users to manage users
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

-- ===========================================================================
-- 2. ORDERS TABLE - Verify authenticated policy exists and add admin policy
-- ===========================================================================

-- The orders table should already have orders_read_auth and orders_write_auth policies
-- But let's ensure authenticated users can actually read orders without restrictions
-- We'll add a specific admin policy

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
-- VERIFICATION
-- ===========================================================================

-- Check that policies were created for authenticated role
SELECT 
  'AUTHENTICATED POLICIES' as check_type,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'orders')
  AND 'authenticated' = ANY(roles)
ORDER BY tablename, policyname;

-- ===========================================================================
-- NOTES
-- ===========================================================================
-- 
-- These policies allow authenticated users to access data when logged in.
-- The frontend adminService uses the authenticated user's session, so these
-- policies will allow admin users to see orders and users in the admin panel.
--
-- Security is maintained because:
-- 1. Policies check users.is_admin = true for admin operations
-- 2. Regular users can only see their own data
-- 3. Service role policies remain for backend API operations
-- ===========================================================================
