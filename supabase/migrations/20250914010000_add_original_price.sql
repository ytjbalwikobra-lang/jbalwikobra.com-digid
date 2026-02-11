-- Migration: reintroduce original_price column
-- Date: 2025-09-14
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  -- Add column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE public.products ADD COLUMN original_price numeric;
  END IF;
END $$;

-- Backfill: if original_price is null or <= 0, set to current price
UPDATE public.products
SET original_price = price
WHERE (original_price IS NULL OR original_price <= 0) AND price IS NOT NULL;

-- Optional: ensure future inserts default original_price to price when not provided
CREATE OR REPLACE FUNCTION public.set_original_price_default()
RETURNS trigger AS $$
BEGIN
  IF NEW.original_price IS NULL OR NEW.original_price <= 0 THEN
    NEW.original_price = NEW.price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_original_price_default ON public.products;
CREATE TRIGGER trg_set_original_price_default
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_original_price_default();

-- (Optional) comment for documentation
COMMENT ON COLUMN public.products.original_price IS 'Original/base price before any discount or flash sale';
