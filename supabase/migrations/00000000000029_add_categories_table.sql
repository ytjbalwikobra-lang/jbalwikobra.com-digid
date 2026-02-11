-- Migration: Add categories table and category_id foreign key to products
-- Date: 2025-09-14
-- Safe, idempotent style (guards) so re-run won't explode

-- 1. Create categories table if not exists
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar NOT NULL,
  slug varchar NOT NULL UNIQUE,
  description text,
  icon varchar,
  color varchar,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add category_id column to products if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='products' AND column_name='category_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN category_id uuid NULL;
  END IF;
END $$;

-- 3. Add FK constraint (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name='fk_products_category' AND table_name='products'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id)
      REFERENCES public.categories (id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Optional index for filtering by category_id + is_active
CREATE INDEX IF NOT EXISTS idx_products_category_id_active ON public.products (category_id, is_active);

-- 5. Backfill: try to map existing legacy text "category" into categories table
--    We'll create categories from distinct product.category values that don't already exist.
WITH distinct_cats AS (
  SELECT DISTINCT TRIM(LOWER(category)) AS slug_raw, category
  FROM public.products
  WHERE category IS NOT NULL AND category <> ''
)
INSERT INTO public.categories (name, slug, description, sort_order)
SELECT dc.category AS name,
       REGEXP_REPLACE(dc.slug_raw, '[^a-z0-9-]', '-', 'g') AS slug,
       'Auto-migrated legacy category',
       100
FROM distinct_cats dc
LEFT JOIN public.categories c ON c.slug = REGEXP_REPLACE(dc.slug_raw, '[^a-z0-9-]', '-', 'g')
WHERE c.id IS NULL;

-- 6. (Optional) Auto attach category_id where possible
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category_id IS NULL
  AND c.slug = REGEXP_REPLACE(TRIM(LOWER(p.category)), '[^a-z0-9-]', '-', 'g');

-- 7. RLS policies (example - adjust roles as needed)
-- Uncomment and adapt if RLS enabled
-- ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (true);
-- CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.role() = 'admin');
-- CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.role() = 'admin');
-- CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.role() = 'admin');

-- 8. Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'categories_set_updated_at'
  ) THEN
    CREATE TRIGGER categories_set_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;

-- Down migration notes (manual): drop FK, column, table if needed.
