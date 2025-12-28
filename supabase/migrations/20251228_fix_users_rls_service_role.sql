-- Fix RLS circular dependency on users table
-- The users table was missing a policy for service_role, causing circular dependency
-- when other policies tried to check users.is_admin

-- Add service role policy to allow bypassing RLS for admin operations
CREATE POLICY "users_service_role_all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment explaining the fix
COMMENT ON POLICY "users_service_role_all" ON public.users IS 
'Allows service role to bypass RLS on users table. This prevents circular dependency where admin policies check users.is_admin but cannot access the users table itself.';
