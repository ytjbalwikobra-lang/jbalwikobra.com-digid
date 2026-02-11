-- Fix RLS policies for admin access
-- This migration updates Row Level Security policies to allow admin operations

-- First, let's check current policies
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename IN ('products', 'tiers', 'game_titles', 'rental_options', 'flash_sales')
ORDER BY tablename, policyname;

-- Drop existing restrictive policies and create more permissive ones for admin operations
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;

-- Create permissive policies for products table
-- Allow anonymous read access (for public product display)
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT USING (true);

-- Allow anonymous insert/update/delete (for admin operations without auth)
-- In production, you should implement proper authentication
CREATE POLICY "Enable insert access for all users" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON products
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON products
  FOR DELETE USING (true);

-- Apply same permissive policies to rental_options
DROP POLICY IF EXISTS "Enable read access for all users" ON rental_options;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON rental_options;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON rental_options;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON rental_options;

CREATE POLICY "Enable read access for all users" ON rental_options
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON rental_options
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON rental_options
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON rental_options
  FOR DELETE USING (true);

-- Apply same permissive policies to flash_sales if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flash_sales') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON flash_sales';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON flash_sales';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update access for authenticated users" ON flash_sales';
    EXECUTE 'DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON flash_sales';
    
    EXECUTE 'CREATE POLICY "Enable read access for all users" ON flash_sales FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Enable insert access for all users" ON flash_sales FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Enable update access for all users" ON flash_sales FOR UPDATE USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Enable delete access for all users" ON flash_sales FOR DELETE USING (true)';
  END IF;
END $$;

-- Ensure RLS is enabled but with permissive policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_options ENABLE ROW LEVEL SECURITY;

-- Enable RLS on flash_sales if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flash_sales') THEN
    EXECUTE 'ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- For reference tables (tiers, game_titles), ensure they're readable
-- These are typically read-only reference data
DROP POLICY IF EXISTS "Enable read access for all users" ON tiers;
CREATE POLICY "Enable read access for all users" ON tiers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON game_titles;
CREATE POLICY "Enable read access for all users" ON game_titles
  FOR SELECT USING (true);

-- Allow admin operations on reference tables
CREATE POLICY "Enable insert access for all users" ON tiers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON tiers
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable insert access for all users" ON game_titles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON game_titles
  FOR UPDATE USING (true) WITH CHECK (true);

-- Verify the policies are in place
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual = 'true' THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as policy_type
FROM pg_policies 
WHERE tablename IN ('products', 'tiers', 'game_titles', 'rental_options', 'flash_sales')
ORDER BY tablename, policyname;
