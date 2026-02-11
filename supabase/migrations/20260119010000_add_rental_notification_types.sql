-- Add rental notification types (new_rent, paid_rent) to admin_notifications type constraint
-- Migration: 20260119_add_rental_notification_types
-- Created: 2026-01-19
-- Purpose: Enable proper rental vs purchase notification type distinction

-- Drop existing type check constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_notifications_type_check'
    AND conrelid = 'admin_notifications'::regclass
  ) THEN
    ALTER TABLE admin_notifications DROP CONSTRAINT admin_notifications_type_check;
    RAISE NOTICE 'Dropped existing type check constraint';
  END IF;
END $$;

-- Add new constraint with rental types included
ALTER TABLE admin_notifications 
  ADD CONSTRAINT admin_notifications_type_check 
  CHECK (type IN (
    'new_order',       -- New purchase order
    'paid_order',      -- Paid purchase order  
    'new_rent',        -- New rental order
    'paid_rent',       -- Paid rental order
    'order_cancelled', -- Cancelled order
    'new_user',        -- New user registration
    'new_review',      -- New product review
    'system'           -- System notification
  ));

-- Add comment for documentation
COMMENT ON CONSTRAINT admin_notifications_type_check ON admin_notifications IS 
  'Allowed notification types: purchase (new_order, paid_order), rental (new_rent, paid_rent), and other system types';
