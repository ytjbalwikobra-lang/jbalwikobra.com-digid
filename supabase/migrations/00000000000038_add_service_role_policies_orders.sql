-- Add service_role policies to orders table for admin API access
-- This ensures the admin API can always access orders data when using service_role key

-- Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing service role policy if it exists, then create it
DROP POLICY IF EXISTS "orders_service_role_all" ON public.orders;

-- Add service role policy to allow full access to orders table
CREATE POLICY "orders_service_role_all" ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment explaining the fix
COMMENT ON POLICY "orders_service_role_all" ON public.orders IS 
'Allows service role to bypass RLS on orders table. This enables the admin API to access all orders data for dashboard statistics and order management.';
