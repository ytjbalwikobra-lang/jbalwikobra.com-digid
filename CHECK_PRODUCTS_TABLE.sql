-- Check for triggers on products table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'products';

-- Check RLS policies on products table
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
WHERE tablename = 'products';

-- Check if there's a price update constraint or rule
SELECT 
    conname,
    contype,
    consrc
FROM pg_constraint
WHERE conrelid = 'products'::regclass;

-- Test a direct price update (replace with your product ID)
-- First, check current value
SELECT id, name, price, stock, updated_at 
FROM products 
WHERE id = 'YOUR_PRODUCT_ID_HERE'
LIMIT 1;

-- Try to update (will show if it works at SQL level)
-- UPDATE products SET price = 99999, stock = 100 WHERE id = 'YOUR_PRODUCT_ID_HERE';
-- SELECT id, price, stock FROM products WHERE id = 'YOUR_PRODUCT_ID_HERE';
