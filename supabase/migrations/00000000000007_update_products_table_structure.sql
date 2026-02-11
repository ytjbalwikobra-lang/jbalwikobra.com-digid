
ALTER TABLE products ADD COLUMN IF NOT EXISTS tier_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS game_title_id UUID;

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'products' AND constraint_name = 'fk_products_tier'
    ) THEN
        EXECUTE 'ALTER TABLE products ADD CONSTRAINT fk_products_tier FOREIGN KEY (tier_id) REFERENCES tiers(id) ON DELETE SET NULL';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'products' AND constraint_name = 'fk_products_game_title'
    ) THEN
        EXECUTE 'ALTER TABLE products ADD CONSTRAINT fk_products_game_title FOREIGN KEY (game_title_id) REFERENCES game_titles(id) ON DELETE SET NULL';
    END IF;
END $$;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_products_tier_id ON products(tier_id);
CREATE INDEX IF NOT EXISTS idx_products_game_title_id ON products(game_title_id);

-- Migrate existing data to new structure
-- Update tier_id based on current tier column (cast enum to text if needed)
UPDATE products p
SET tier_id = t.id
FROM tiers t
WHERE p.tier IS NOT NULL AND t.slug = p.tier::text;

-- Update game_title_id based on current game_title column
UPDATE products p
SET game_title_id = gt.id
FROM game_titles gt
WHERE p.game_title IS NOT NULL AND gt.name = p.game_title;

-- For products without matching game_title, assign to Mobile Legends as default
UPDATE products SET game_title_id = (
    SELECT id FROM game_titles WHERE slug = 'mobile-legends'
) WHERE products.game_title_id IS NULL;

-- For products without matching tier, assign to reguler as default
UPDATE products SET tier_id = (
    SELECT id FROM tiers WHERE slug = 'reguler'
) WHERE products.tier_id IS NULL;

-- Create backup of old data (for reference)
CREATE TABLE IF NOT EXISTS products_backup AS SELECT * FROM products;

-- Drop old enum type and columns (keep as backup first)
-- ALTER TABLE products DROP COLUMN tier;
-- ALTER TABLE products DROP COLUMN game_title;
-- ALTER TABLE products DROP COLUMN category;

-- Note: We'll keep the old columns for now to ensure data integrity
-- They can be dropped after verification that the migration worked correctly
