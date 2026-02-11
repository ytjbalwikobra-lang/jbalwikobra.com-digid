-- Create or update schema for tiers and game_titles in an idempotent, non-destructive way

-- Ensure tiers table has expected columns (it may already exist from 006_*)
DO $$
BEGIN
    -- Widen column types if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tiers' AND column_name = 'name' AND character_maximum_length < 100
    ) THEN
        EXECUTE 'ALTER TABLE tiers ALTER COLUMN name TYPE VARCHAR(100)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tiers' AND column_name = 'slug' AND character_maximum_length < 100
    ) THEN
        EXECUTE 'ALTER TABLE tiers ALTER COLUMN slug TYPE VARCHAR(100)';
    END IF;

    -- Add new columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tiers' AND column_name = 'background_gradient'
    ) THEN
        EXECUTE 'ALTER TABLE tiers ADD COLUMN background_gradient VARCHAR(100)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tiers' AND column_name = 'icon'
    ) THEN
        EXECUTE 'ALTER TABLE tiers ADD COLUMN icon VARCHAR(50)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tiers' AND column_name = 'price_range_min'
    ) THEN
        EXECUTE 'ALTER TABLE tiers ADD COLUMN price_range_min INTEGER DEFAULT 0';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tiers' AND column_name = 'price_range_max'
    ) THEN
        EXECUTE 'ALTER TABLE tiers ADD COLUMN price_range_max INTEGER';
    END IF;
END $$;

-- Create game_titles table if it doesn't exist
CREATE TABLE IF NOT EXISTS game_titles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        category VARCHAR(50), -- MOBA, Battle Royale, RPG, FPS, Strategy
        icon VARCHAR(50), -- Icon name for UI
        color VARCHAR(20), -- Theme color
        logo_url VARCHAR(500), -- Game logo URL
        is_popular BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance (guard with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_tiers_slug ON tiers(slug);
CREATE INDEX IF NOT EXISTS idx_tiers_is_active ON tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_tiers_sort_order ON tiers(sort_order);

CREATE INDEX IF NOT EXISTS idx_game_titles_slug ON game_titles(slug);
CREATE INDEX IF NOT EXISTS idx_game_titles_category ON game_titles(category);
CREATE INDEX IF NOT EXISTS idx_game_titles_is_active ON game_titles(is_active);
CREATE INDEX IF NOT EXISTS idx_game_titles_is_popular ON game_titles(is_popular);
CREATE INDEX IF NOT EXISTS idx_game_titles_sort_order ON game_titles(sort_order);

-- Create triggers for updated_at (guard if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_tiers_updated_at'
    ) THEN
        EXECUTE 'CREATE TRIGGER update_tiers_updated_at BEFORE UPDATE ON tiers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_game_titles_updated_at'
    ) THEN
        EXECUTE 'CREATE TRIGGER update_game_titles_updated_at BEFORE UPDATE ON game_titles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()';
    END IF;
END $$;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_titles ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tiers' AND policyname = 'Tiers are viewable by everyone'
    ) THEN
        EXECUTE 'CREATE POLICY "Tiers are viewable by everyone" ON tiers FOR SELECT USING (true)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'game_titles' AND policyname = 'Game titles are viewable by everyone'
    ) THEN
        EXECUTE 'CREATE POLICY "Game titles are viewable by everyone" ON game_titles FOR SELECT USING (true)';
    END IF;
END $$;

-- Seed/Upsert tier data
INSERT INTO tiers (name, slug, description, color, border_color, background_gradient, icon, price_range_min, price_range_max, sort_order)
VALUES
('Reguler', 'reguler', 'Akun standar dengan fitur dasar, cocok untuk pemula dan budget terbatas', '#6b7280', '#9ca3af', 'from-pink-600 to-rose-600', 'Trophy', 0, 500000, 1),
('Pelajar', 'pelajar', 'Akun premium dengan harga khusus untuk pelajar dan mahasiswa', '#3b82f6', '#60a5fa', 'from-blue-500 to-indigo-600', 'Users', 500000, 2000000, 2),
('Premium', 'premium', 'Akun premium dengan fitur lengkap dan koleksi terbaik untuk pro player', '#f59e0b', '#fbbf24', 'from-amber-500 to-orange-600', 'Crown', 2000000, NULL, 3)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    border_color = EXCLUDED.border_color,
    background_gradient = EXCLUDED.background_gradient,
    icon = EXCLUDED.icon,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    sort_order = EXCLUDED.sort_order;

-- Seed/Upsert game titles
INSERT INTO game_titles (name, slug, description, category, icon, color, is_popular, sort_order)
VALUES
('Mobile Legends', 'mobile-legends', 'MOBA terpopuler di Indonesia dengan hero dan skin legendary', 'MOBA', 'Shield', '#1e40af', TRUE, 1),
('PUBG Mobile', 'pubg-mobile', 'Battle Royale dengan grafis realistis dan gameplay kompetitif', 'Battle Royale', 'Target', '#dc2626', TRUE, 2),
('Free Fire', 'free-fire', 'Battle Royale ringan dengan karakter unik dan gameplay cepat', 'Battle Royale', 'Zap', '#ea580c', TRUE, 3),
('Genshin Impact', 'genshin-impact', 'RPG open world dengan karakter anime dan sistem gacha', 'RPG', 'Sparkles', '#7c3aed', TRUE, 4),
('Call of Duty Mobile', 'call-of-duty-mobile', 'FPS dengan mode Battle Royale dan Multiplayer', 'FPS', 'Crosshair', '#374151', TRUE, 5),
('Valorant', 'valorant', 'FPS taktis dengan agent abilities dan gameplay kompetitif', 'FPS', 'Crosshair', '#ff4655', TRUE, 6),
('Arena of Valor', 'arena-of-valor', 'MOBA dengan hero DC Comics dan gameplay balanced', 'MOBA', 'Sword', '#0ea5e9', FALSE, 7),
('Clash of Clans', 'clash-of-clans', 'Strategy game dengan village building dan clan wars', 'Strategy', 'Castle', '#22c55e', FALSE, 8),
('Clash Royale', 'clash-royale', 'Strategy card game dengan tower defense mechanics', 'Strategy', 'Crown', '#a855f7', FALSE, 9),
('Honkai Impact', 'honkai-impact', 'Action RPG dengan karakter anime dan combat dinamis', 'RPG', 'Zap', '#ec4899', FALSE, 10)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order;
