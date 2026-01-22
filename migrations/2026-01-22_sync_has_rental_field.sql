-- Migration: Sync has_rental field with rental_options table
-- Date: 2026-01-22
-- Description: Updates has_rental field for all products based on whether they have rental options

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

-- Create a trigger function to automatically maintain has_rental field
CREATE OR REPLACE FUNCTION sync_product_has_rental()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Set has_rental = true for the product
    UPDATE products
    SET has_rental = true
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if product still has other rental options
    UPDATE products
    SET has_rental = CASE 
      WHEN EXISTS (
        SELECT 1 FROM rental_options 
        WHERE product_id = OLD.product_id 
        AND id != OLD.id
      ) THEN true
      ELSE false
    END
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_product_has_rental ON rental_options;

-- Create trigger to automatically sync has_rental
CREATE TRIGGER trigger_sync_product_has_rental
AFTER INSERT OR UPDATE OR DELETE ON rental_options
FOR EACH ROW
EXECUTE FUNCTION sync_product_has_rental();

-- Verification query
SELECT 
  COUNT(*) FILTER (WHERE has_rental = true) as products_with_rental,
  COUNT(*) FILTER (WHERE has_rental = false OR has_rental IS NULL) as products_without_rental,
  COUNT(*) as total_products
FROM products
WHERE archived_at IS NULL;
