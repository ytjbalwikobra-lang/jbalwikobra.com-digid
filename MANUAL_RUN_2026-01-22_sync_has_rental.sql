-- Quick sync of has_rental field
-- Run this via Supabase dashboard SQL editor or via psql

-- Update products to set has_rental = true if they have rental options
UPDATE products
SET has_rental = true
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM rental_options
)
AND (has_rental IS NULL OR has_rental = false);

-- Update products to set has_rental = false if they don't have rental options  
UPDATE products
SET has_rental = false
WHERE id NOT IN (
  SELECT DISTINCT product_id 
  FROM rental_options
)
AND (has_rental IS NULL OR has_rental = true);

-- Verify the results
SELECT 
  COUNT(*) FILTER (WHERE has_rental = true) as products_with_rental,
  COUNT(*) FILTER (WHERE has_rental = false OR has_rental IS NULL) as products_without_rental,
  COUNT(*) as total_products
FROM products
WHERE archived_at IS NULL;
