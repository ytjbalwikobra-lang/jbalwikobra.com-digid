-- MINIMAL schema fix - just the essentials to make admin work
-- Run this in Supabase Dashboard SQL Editor

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tiers table if it doesn't exist
CREATE TABLE IF NOT EXISTS tiers (
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

-- Create game_titles table if it doesn't exist
CREATE TABLE IF NOT EXISTS game_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    logo_url VARCHAR(500),
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to products table (safe check)
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

-- Add foreign key constraints (safe check)
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

-- Insert tier data (safe upsert)
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

-- Insert game titles data (without category to avoid errors)
INSERT INTO game_titles (name, slug, description, icon, color, is_popular, sort_order) VALUES
('Mobile Legends', 'mobile-legends', 'MOBA terpopuler di Indonesia dengan hero dan skin legendary', 'Shield', '#1e40af', TRUE, 1),
('PUBG Mobile', 'pubg-mobile', 'Battle Royale dengan grafis realistis dan gameplay kompetitif', 'Target', '#dc2626', TRUE, 2),
('Free Fire', 'free-fire', 'Battle Royale ringan dengan karakter unik dan gameplay cepat', 'Zap', '#ea580c', TRUE, 3),
('Genshin Impact', 'genshin-impact', 'RPG open world dengan karakter anime dan sistem gacha', 'Sparkles', '#7c3aed', TRUE, 4),
('Call of Duty Mobile', 'call-of-duty-mobile', 'FPS dengan mode Battle Royale dan Multiplayer', 'Crosshair', '#374151', TRUE, 5),
('Valorant', 'valorant', 'FPS taktis dengan agent abilities dan gameplay kompetitif', 'Crosshair', '#ff4655', TRUE, 6),
('Arena of Valor', 'arena-of-valor', 'MOBA dengan hero DC Comics dan gameplay balanced', 'Sword', '#0ea5e9', FALSE, 7),
('Clash of Clans', 'clash-of-clans', 'Strategy game dengan village building dan clan wars', 'Castle', '#22c55e', FALSE, 8)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Update existing products to have proper foreign key relationships
UPDATE products SET tier_id = (
    SELECT id FROM tiers WHERE tiers.slug = 'reguler'
) WHERE tier_id IS NULL;

UPDATE products SET game_title_id = (
    SELECT id FROM game_titles WHERE game_titles.slug = 'mobile-legends'
) WHERE game_title_id IS NULL;

-- Enable RLS on new tables
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_titles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (safe check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tiers' AND policyname='Tiers are viewable by everyone') THEN
        CREATE POLICY "Tiers are viewable by everyone" ON tiers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_titles' AND policyname='Game titles are viewable by everyone') THEN
        CREATE POLICY "Game titles are viewable by everyone" ON game_titles FOR SELECT USING (true);
    END IF;
END $$;

-- Success message
SELECT 
    'Minimal migration completed successfully!' as status,
    (SELECT COUNT(*) FROM tiers) as tiers_count,
    (SELECT COUNT(*) FROM game_titles) as game_titles_count,
    (SELECT COUNT(*) FROM products WHERE tier_id IS NOT NULL) as products_with_tier,
    (SELECT COUNT(*) FROM products WHERE game_title_id IS NOT NULL) as products_with_game_title;
