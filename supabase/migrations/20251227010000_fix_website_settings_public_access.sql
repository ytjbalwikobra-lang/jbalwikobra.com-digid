-- Migration: Fix website_settings public access for favicon and logo
-- Date: 2025-12-27
-- Description: After security hardening, website_settings table was restricted 
-- to authenticated users only. This breaks favicon/logo loading on initial page load
-- (before authentication). This migration restores public SELECT access while 
-- keeping write operations restricted to admin users only.

-- ============================================================================
-- WEBSITE_SETTINGS TABLE - Allow public read access
-- ============================================================================

-- Drop the authenticated-only select policy
DROP POLICY IF EXISTS "website_settings_auth_select" ON public.website_settings;

-- Create new policy allowing public (anon + authenticated) read access
CREATE POLICY "website_settings_public_select" ON public.website_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Note: website_settings_admin_all policy remains for admin write operations
-- This ensures:
-- 1. Anonymous users can fetch favicon, logo, and site settings
-- 2. Authenticated users can read all settings
-- 3. Only admins can create/update/delete settings

-- ============================================================================
-- GRANT STATEMENTS - Ensure proper role access
-- ============================================================================

-- Grant SELECT on website_settings to anon role
GRANT SELECT ON public.website_settings TO anon;

-- Migration completed successfully
-- Anonymous users can now load favicon, logo, and basic site information
