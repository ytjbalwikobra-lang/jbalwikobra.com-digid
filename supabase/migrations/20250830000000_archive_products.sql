-- Add archive flags for products so sold items are hidden from public but visible in admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_active'
  ) THEN
    ALTER TABLE products ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='archived_at'
  ) THEN
    ALTER TABLE products ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
END $$;

-- Helpful index for storefront filters
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
