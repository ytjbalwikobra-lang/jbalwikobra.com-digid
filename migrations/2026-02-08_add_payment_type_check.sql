-- ============================================================
-- Migration: Add 'payment' and 'order' to customer_notifications type check
-- Date: 2026-02-08
-- Purpose: The notifications_type_check constraint didn't include 'payment' or 'order'
--          which are needed for customer-facing payment confirmation notifications
-- ============================================================

BEGIN;

-- Drop the old check constraint
ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recreate with all valid types (original + new)
ALTER TABLE public.customer_notifications ADD CONSTRAINT customer_notifications_type_check
  CHECK (type IN ('product', 'feed_post', 'system', 'payment', 'order', 'promo'));

COMMIT;
