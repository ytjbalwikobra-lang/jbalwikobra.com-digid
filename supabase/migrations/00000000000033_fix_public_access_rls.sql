-- Migration: Fix RLS policies for public access
-- Date: 2025-12-26
-- Description: After security hardening, some tables that should be publicly visible
-- (products, banners, flash_sales, categories, game_titles, tiers, rental_options, reviews)
-- were restricted to authenticated users only. This migration restores public SELECT access
-- while keeping write operations restricted to authenticated/admin users.

-- ============================================================================
-- 1. PRODUCTS TABLE - Allow public read access for active products
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "products_auth_select" ON public.products;

-- Create new policy allowing both anon and authenticated users to read active products
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Note: products_admin_all policy remains for admin write operations

-- ============================================================================
-- 2. BANNERS TABLE - Allow public read access
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "banners_auth_select" ON public.banners;

-- Create new policy allowing public read access
CREATE POLICY "banners_public_select" ON public.banners
  FOR SELECT TO anon, authenticated
  USING (true);

-- Note: banners_admin_all policy remains for admin write operations

-- ============================================================================
-- 3. FLASH_SALES TABLE - Allow public read access for active sales
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "flash_sales_auth_select" ON public.flash_sales;

-- Create new policy allowing public read access for active flash sales
CREATE POLICY "flash_sales_public_select" ON public.flash_sales
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Note: flash_sales_admin_all policy remains for admin write operations

-- ============================================================================
-- 4. CATEGORIES TABLE - Allow public read access for active categories
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop any existing select policies that might conflict
DROP POLICY IF EXISTS "categories_auth_select" ON public.categories;
DROP POLICY IF EXISTS "categories_select" ON public.categories;

-- Create new policy allowing public read access for active categories
CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Create admin policy for write operations (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'categories' 
    AND policyname = 'categories_admin_all'
  ) THEN
    CREATE POLICY "categories_admin_all" ON public.categories
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- ============================================================================
-- 5. GAME_TITLES TABLE - Allow public read access for active game titles
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "game_titles_auth_select" ON public.game_titles;

-- Create new policy allowing public read access for active game titles
CREATE POLICY "game_titles_public_select" ON public.game_titles
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Note: game_titles_admin_all policy remains for admin write operations

-- ============================================================================
-- 6. TIERS TABLE - Allow public read access for active tiers
-- ============================================================================

-- Check if tiers table exists before doing anything
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiers') THEN
    -- Drop any existing authenticated-only select policy
    DROP POLICY IF EXISTS "tiers_auth_select" ON public.tiers;
    DROP POLICY IF EXISTS "tiers_select" ON public.tiers;
    
    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY';
    
    -- Create new policy allowing public read access for active tiers
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'tiers' 
      AND policyname = 'tiers_public_select'
    ) THEN
      CREATE POLICY "tiers_public_select" ON public.tiers
        FOR SELECT TO anon, authenticated
        USING (is_active = true);
    END IF;
    
    -- Create admin policy for write operations (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'tiers' 
      AND policyname = 'tiers_admin_all'
    ) THEN
      CREATE POLICY "tiers_admin_all" ON public.tiers
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 7. RENTAL_OPTIONS TABLE - Allow public read access
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "rental_options_auth_select" ON public.rental_options;

-- Create new policy allowing public read access
CREATE POLICY "rental_options_public_select" ON public.rental_options
  FOR SELECT TO anon, authenticated
  USING (true);

-- Note: rental_options_admin_all policy remains for admin write operations

-- ============================================================================
-- 8. REVIEWS TABLE - Allow public read access
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "reviews_auth_select" ON public.reviews;

-- Create new policy allowing public read access for all reviews
CREATE POLICY "reviews_public_select" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (true);

-- Note: reviews_user_all policy remains for users to manage their own reviews

-- ============================================================================
-- 9. STORAGE.OBJECTS - Allow public read access for product-images and game-logos
-- ============================================================================

-- Drop the authenticated-only storage policies
DROP POLICY IF EXISTS "storage_auth_select" ON storage.objects;

-- Create new policy allowing public read access to product images and game logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'storage_public_select'
  ) THEN
    CREATE POLICY "storage_public_select" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id IN ('product-images', 'game-logos'));
  END IF;
END $$;

-- Note: storage_auth_insert, storage_admin_update, storage_admin_delete policies remain for write operations

-- ============================================================================
-- 10. PRODUCT_LIKES TABLE - Allow public read access (optional for displaying like counts)
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "product_likes_auth_select" ON public.product_likes;

-- Create new policy allowing public read access
CREATE POLICY "product_likes_public_select" ON public.product_likes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Note: product_likes_user_all policy remains for users to manage their own likes

-- ============================================================================
-- GRANT STATEMENTS - Ensure proper role access
-- ============================================================================

-- Grant SELECT on public tables to anon role
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.flash_sales TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.game_titles TO anon;
GRANT SELECT ON public.rental_options TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.product_likes TO anon;

-- Grant SELECT on tiers if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiers') THEN
    EXECUTE 'GRANT SELECT ON public.tiers TO anon';
  END IF;
END $$;

-- Migration completed successfully
-- Note: Admin write policies are preserved, only SELECT access was changed to public
