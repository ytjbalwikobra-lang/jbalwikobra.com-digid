-- =============================================================================
-- FIX RLS POLICIES FOR PRODUCTS TABLE
-- =============================================================================
-- This adds proper RLS policies to prevent unauthorized updates
-- =============================================================================

BEGIN;

-- 1. Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Products select all" ON public.products;
DROP POLICY IF EXISTS "Products admin modify" ON public.products;
DROP POLICY IF EXISTS "products_public_select" ON public.products;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

-- 3. Create new policies

-- Allow everyone to SELECT products (public storefront)
CREATE POLICY "products_select_all" 
ON public.products 
FOR SELECT 
USING (true);

-- Only authenticated admin users can INSERT
CREATE POLICY "products_insert_admin" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Only authenticated admin users can UPDATE
CREATE POLICY "products_update_admin" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Only authenticated admin users can DELETE
CREATE POLICY "products_delete_admin" 
ON public.products 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Service role bypasses all RLS (for API operations)
CREATE POLICY "products_service_role_all" 
ON public.products 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

COMMIT;

-- =============================================================================
-- VERIFY POLICIES
-- =============================================================================

-- View all policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY policyname;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'products';
