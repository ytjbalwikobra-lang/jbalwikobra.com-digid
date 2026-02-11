-- Production-safe schema fix - adapts to existing constraints
-- Run this in Supabase Dashboard SQL Editor

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Check existing schema and adapt
DO $$
DECLARE
    tier_max_nullable BOOLEAN;
BEGIN
    -- Check if price_range_max allows NULL in existing tiers table
    SELECT is_nullable = 'YES' INTO tier_max_nullable
    FROM information_schema.columns 
    WHERE table_name = 'tiers' AND column_name = 'price_range_max';
    
    -- Create tiers table if it doesn't exist, adapting to production constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiers') THEN
        CREATE TABLE tiers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL UNIQUE,
            slug VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            color VARCHAR(20),
            border_color VARCHAR(20),
            background_gradient VARCHAR(100),
            icon VARCHAR(50),
            price_range_min INTEGER DEFAULT 0,
            price_range_max INTEGER NOT NULL DEFAULT 10000000,
            is_active BOOLEAN DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- If price_range_max doesn't allow NULL but we created it nullable, fix it
    IF tier_max_nullable IS FALSE THEN
        -- Table exists and doesn't allow NULL, ensure we have a default
        EXECUTE 'ALTER TABLE tiers ALTER COLUMN price_range_max SET DEFAULT 10000000';
        EXECUTE 'UPDATE tiers SET price_range_max = 10000000 WHERE price_range_max IS NULL';
    END IF;
END $$;

-- Step 2: Create game_titles table if it doesn't exist
CREATE TABLE IF NOT EXISTS game_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    icon VARCHAR(50),
    color VARCHAR(20),
    logo_url VARCHAR(500),
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add missing columns to products table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tier_id') THEN
        ALTER TABLE products ADD COLUMN tier_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'game_title_id') THEN
        ALTER TABLE products ADD COLUMN game_title_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'account_level') THEN
        ALTER TABLE products ADD COLUMN account_level VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'account_details') THEN
        ALTER TABLE products ADD COLUMN account_details TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'images') THEN
        ALTER TABLE products ADD COLUMN images TEXT[];
    END IF;
END $$;

-- Step 4: Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_tier') THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_tier 
            FOREIGN KEY (tier_id) REFERENCES tiers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_game_title') THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_game_title 
            FOREIGN KEY (game_title_id) REFERENCES game_titles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 5: Insert tier data (production-safe with proper price_range_max values)
INSERT INTO tiers (name, slug, description, color, border_color, background_gradient, icon, price_range_min, price_range_max, sort_order) VALUES
('Reguler', 'reguler', 'Akun standar dengan fitur dasar, cocok untuk pemula dan budget terbatas', '#6b7280', '#9ca3af', 'from-pink-600 to-rose-600', 'Trophy', 0, 500000, 1),
('Pelajar', 'pelajar', 'Akun premium dengan harga khusus untuk pelajar dan mahasiswa', '#3b82f6', '#60a5fa', 'from-blue-500 to-indigo-600', 'Users', 500000, 2000000, 2),
('Premium', 'premium', 'Akun premium dengan fitur lengkap dan koleksi terbaik untuk pro player', '#f59e0b', '#fbbf24', 'from-amber-500 to-orange-600', 'Crown', 2000000, 10000000, 3)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    border_color = EXCLUDED.border_color,
    background_gradient = EXCLUDED.background_gradient,
    icon = EXCLUDED.icon,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Step 6: Insert game titles data
INSERT INTO game_titles (name, slug, description, category, icon, color, is_popular, sort_order) VALUES
('Mobile Legends', 'mobile-legends', 'MOBA terpopuler di Indonesia dengan hero dan skin legendary', 'MOBA', 'Shield', '#1e40af', TRUE, 1),
('PUBG Mobile', 'pubg-mobile', 'Battle Royale dengan grafis realistis dan gameplay kompetitif', 'Battle Royale', 'Target', '#dc2626', TRUE, 2),
('Free Fire', 'free-fire', 'Battle Royale ringan dengan karakter unik dan gameplay cepat', 'Battle Royale', 'Zap', '#ea580c', TRUE, 3),
('Genshin Impact', 'genshin-impact', 'RPG open world dengan karakter anime dan sistem gacha', 'RPG', 'Sparkles', '#7c3aed', TRUE, 4),
('Call of Duty Mobile', 'call-of-duty-mobile', 'FPS dengan mode Battle Royale dan Multiplayer', 'FPS', 'Crosshair', '#374151', TRUE, 5),
('Valorant', 'valorant', 'FPS taktis dengan agent abilities dan gameplay kompetitif', 'FPS', 'Crosshair', '#ff4655', TRUE, 6),
('Arena of Valor', 'arena-of-valor', 'MOBA dengan hero DC Comics dan gameplay balanced', 'MOBA', 'Sword', '#0ea5e9', FALSE, 7),
('Clash of Clans', 'clash-of-clans', 'Strategy game dengan village building dan clan wars', 'Strategy', 'Castle', '#22c55e', FALSE, 8)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Step 7: Update existing products to have proper foreign key relationships
UPDATE products SET tier_id = (
    SELECT id FROM tiers WHERE tiers.slug = 'reguler'
) WHERE tier_id IS NULL;

UPDATE products SET game_title_id = (
    SELECT id FROM game_titles WHERE game_titles.slug = 'mobile-legends'
) WHERE game_title_id IS NULL;

-- Step 8: Create indexes for performance (safe)
CREATE INDEX IF NOT EXISTS idx_tiers_slug ON tiers(slug);
CREATE INDEX IF NOT EXISTS idx_tiers_is_active ON tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_game_titles_slug ON game_titles(slug);
CREATE INDEX IF NOT EXISTS idx_game_titles_category ON game_titles(category);
CREATE INDEX IF NOT EXISTS idx_game_titles_is_active ON game_titles(is_active);
CREATE INDEX IF NOT EXISTS idx_products_tier_id ON products(tier_id);
CREATE INDEX IF NOT EXISTS idx_products_game_title_id ON products(game_title_id);

-- Step 9: Enable RLS on new tables
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_titles ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for public read access (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tiers' AND policyname='Tiers are viewable by everyone') THEN
        CREATE POLICY "Tiers are viewable by everyone" ON tiers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_titles' AND policyname='Game titles are viewable by everyone') THEN
        CREATE POLICY "Game titles are viewable by everyone" ON game_titles FOR SELECT USING (true);
    END IF;
END $$;

-- Step 11: Create or replace the optimized view
CREATE OR REPLACE VIEW products_with_details AS
SELECT 
    p.*,
    t.name as tier_name,
    t.slug as tier_slug,
    t.description as tier_description,
    t.color as tier_color,
    t.border_color as tier_border_color,
    t.background_gradient as tier_background_gradient,
    t.icon as tier_icon,
    t.price_range_min as tier_price_min,
    t.price_range_max as tier_price_max,
    gt.name as game_title_name,
    gt.slug as game_title_slug,
    gt.description as game_title_description,
    gt.category as game_category,
    gt.icon as game_icon,
    gt.color as game_color,
    gt.logo_url as game_logo_url,
    gt.is_popular as game_is_popular
FROM products p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN game_titles gt ON p.game_title_id = gt.id;

-- Grant access to the view
GRANT SELECT ON products_with_details TO anon, authenticated;

-- Step 12: Insert sample products only if table is empty
INSERT INTO products (
    name, description, price, original_price, image, images,
    tier_id, game_title_id, account_level, account_details, 
    has_rental, stock, is_flash_sale
) 
SELECT 
    'Akun ML Mythic Glory Premium',
    'Akun Mobile Legends dengan rank Mythic Glory. Semua hero unlocked, 500+ skin epic/legend.',
    2500000,
    3000000,
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    ARRAY['https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400'],
    (SELECT id FROM tiers WHERE slug = 'premium'),
    (SELECT id FROM game_titles WHERE slug = 'mobile-legends'),
    'Mythic Glory',
    'All heroes unlocked, 500+ skins, Winrate 75%',
    true,
    5,
    false
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

-- Add rental options for sample products
INSERT INTO rental_options (product_id, duration, price, description)
SELECT 
    p.id,
    '1 Hari',
    150000,
    'Akses full 24 jam'
FROM products p 
WHERE p.name = 'Akun ML Mythic Glory Premium'
AND NOT EXISTS (SELECT 1 FROM rental_options WHERE product_id = p.id);

-- Final verification
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM tiers) as tiers_count,
    (SELECT COUNT(*) FROM game_titles) as game_titles_count,
    (SELECT COUNT(*) FROM products) as products_count,
    (SELECT COUNT(*) FROM products WHERE tier_id IS NOT NULL) as products_with_tier,
    (SELECT COUNT(*) FROM products WHERE game_title_id IS NOT NULL) as products_with_game_title;
