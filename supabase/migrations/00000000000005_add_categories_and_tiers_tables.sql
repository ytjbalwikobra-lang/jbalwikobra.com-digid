-- Create categories table for dynamic category management

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100), -- Icon class or URL
    color VARCHAR(20), -- Hex color code
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default categories based on existing data
INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES
('MOBA', 'moba', 'Multiplayer Online Battle Arena games like Mobile Legends, Arena of Valor', 'Shield', '#ec4899', 1),
('Battle Royale', 'battle-royale', 'Battle Royale games like PUBG Mobile, Free Fire', 'Target', '#f59e0b', 2),
('RPG', 'rpg', 'Role Playing Games like Genshin Impact, Honkai Impact', 'Sword', '#8b5cf6', 3),
('FPS', 'fps', 'First Person Shooter games like Call of Duty, Valorant', 'Zap', '#ef4444', 4),
('Strategy', 'strategy', 'Strategy games like Clash of Clans, Clash Royale', 'Brain', '#10b981', 5);

-- Add RLS policy
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Create tiers table for dynamic tier management
CREATE TABLE tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20), -- Hex color code for badges
    border_color VARCHAR(20), -- Border color for badges
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_tiers_slug ON tiers(slug);
CREATE INDEX idx_tiers_is_active ON tiers(is_active);
CREATE INDEX idx_tiers_sort_order ON tiers(sort_order);

-- Create trigger for updated_at
CREATE TRIGGER update_tiers_updated_at BEFORE UPDATE ON tiers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default tiers
INSERT INTO tiers (name, slug, description, color, border_color, sort_order) VALUES
('Reguler', 'reguler', 'Akun standar dengan fitur dasar, cocok untuk pemula', '#6b7280', '#9ca3af', 1),
('Pelajar', 'pelajar', 'Akun premium dengan harga khusus untuk pelajar dan mahasiswa', '#3b82f6', '#60a5fa', 2),
('Premium', 'premium', 'Akun premium dengan fitur lengkap dan koleksi terbaik', '#f59e0b', '#fbbf24', 3);

-- Add RLS policy
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are viewable by everyone" ON tiers FOR SELECT USING (true);
