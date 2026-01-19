-- Add rental notification types (new_rent, paid_rent) to admin_notifications type constraint
-- Created: 2026-01-19
-- Purpose: Fix missing notifications for rental orders

-- First, check if there's an existing type check constraint and drop it
DO $$
BEGIN
  -- Drop the existing type check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'admin_notifications' 
    AND constraint_name LIKE '%type_check%'
  ) THEN
    EXECUTE 'ALTER TABLE admin_notifications DROP CONSTRAINT admin_notifications_type_check';
    RAISE NOTICE 'Dropped existing type check constraint';
  END IF;
END $$;

-- Add new constraint that includes rental types
ALTER TABLE admin_notifications 
  ADD CONSTRAINT admin_notifications_type_check 
  CHECK (type IN (
    'new_order',      -- New purchase order
    'paid_order',     -- Paid purchase order
    'new_rent',       -- New rental order
    'paid_rent',      -- Paid rental order  
    'order_cancelled',-- Cancelled order
    'new_user',       -- New user registration
    'new_review',     -- New product review
    'system'          -- System notification
  ));

COMMENT ON CONSTRAINT admin_notifications_type_check ON admin_notifications IS 
  'Allowed notification types including purchase and rental variants';
