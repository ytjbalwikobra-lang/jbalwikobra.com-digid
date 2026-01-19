-- ============================================================
-- MANUAL MIGRATION INSTRUCTIONS
-- ============================================================
-- 
-- Please copy the SQL below and run it in Supabase SQL Editor:
-- URL: https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new
--
-- This migration adds support for rental notification types
-- (new_rent, paid_rent) to the admin_notifications table
-- ============================================================

-- Step 1: Drop existing type check constraint
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

-- Step 2: Add new constraint with rental types
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

-- Step 3: Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'admin_notifications_type_check';

-- Step 4: Test by inserting a test rental notification
INSERT INTO admin_notifications (
  type,
  title,
  message,
  is_read,
  created_at
) VALUES (
  'paid_rent',
  'Test Rental Notification',
  'This is a test to verify paid_rent type works',
  true,
  NOW()
) RETURNING id, type, title;

-- Step 5: Clean up test notification
DELETE FROM admin_notifications 
WHERE title = 'Test Rental Notification' 
  AND is_read = true;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After running the above SQL, you should see:
-- 1. "Dropped existing type check constraint" notice
-- 2. Constraint definition showing all types including new_rent, paid_rent
-- 3. Successful insert of test notification with paid_rent type
-- 4. Test notification deleted
--
-- If all steps complete successfully, the migration is done!
-- ============================================================
