-- ===========================================================================
-- VERIFICATION SCRIPT FOR SERVICE ROLE POLICIES
-- ===========================================================================
-- 
-- This script verifies that all admin-related tables have service_role policies
-- to prevent the admin panel from showing empty tables.
--
-- RUN THIS IN: Supabase SQL Editor after applying the migrations
-- ===========================================================================

-- Check service_role policies on all admin tables
SELECT 
  'SERVICE_ROLE POLICIES' as check_type,
  tablename,
  policyname,
  roles,
  cmd,
  CASE 
    WHEN 'service_role' = ANY(roles) THEN '[OK] HAS SERVICE_ROLE POLICY'
    ELSE '[MISSING] NO SERVICE_ROLE POLICY'
  END as status
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
ORDER BY tablename, policyname;

-- Summary: Count service_role policies per table
SELECT 
  'SUMMARY: Service Role Policies Per Table' as check_type,
  tablename,
  COUNT(*) as policy_count
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
  AND 'service_role' = ANY(roles)
GROUP BY tablename
ORDER BY tablename;

-- Test actual counts (should return > 0 for tables with data)
SELECT 
  'users' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '[OK]' ELSE '[WARNING]' END as status
FROM users
UNION ALL
SELECT 
  'orders' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '[OK]' ELSE '[WARNING]' END as status
FROM orders
UNION ALL
SELECT 
  'products' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '[OK]' ELSE '[WARNING]' END as status
FROM products;

-- Test revenue calculation (should match actual order amounts)
SELECT 
  'REVENUE CALCULATION' as check_type,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status IN ('paid', 'completed')) as completed_orders,
  SUM(amount) FILTER (WHERE status IN ('paid', 'completed')) as total_revenue,
  CASE 
    WHEN SUM(amount) FILTER (WHERE status IN ('paid', 'completed')) > 0 THEN '[OK] REVENUE > 0'
    ELSE '[WARNING] NO REVENUE'
  END as status
FROM orders;

-- ===========================================================================
-- EXPECTED RESULTS
-- ===========================================================================
-- 
-- 1. Each admin table should have at least one service_role policy
-- 2. All counts should show [OK] if tables have data
-- 3. Revenue should show [OK] REVENUE > 0 if there are completed/paid orders
--
-- If you see [MISSING] or [WARNING], the admin panel will show empty tables.
-- ===========================================================================
