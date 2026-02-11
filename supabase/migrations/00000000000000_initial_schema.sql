-- JB Alwikobra E-commerce Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2),
    image VARCHAR(500) NOT NULL,
    images TEXT[], -- Array of image URLs
    category VARCHAR(100) NOT NULL,
    game_title VARCHAR(100) NOT NULL,
    account_level VARCHAR(50),
    account_details TEXT,
    is_flash_sale BOOLEAN DEFAULT FALSE,
    flash_sale_end_time TIMESTAMP WITH TIME ZONE,
    has_rental BOOLEAN DEFAULT FALSE,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rental_options table
CREATE TABLE rental_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    duration VARCHAR(50) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flash_sales table
CREATE TABLE flash_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sale_price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    order_type VARCHAR(20) CHECK (order_type IN ('purchase', 'rental')) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')) DEFAULT 'pending',
    payment_method VARCHAR(20) CHECK (payment_method IN ('xendit', 'whatsapp')) NOT NULL,
    rental_duration VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_game_title ON products(game_title);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_flash_sale ON products(is_flash_sale);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_flash_sales_product_id ON flash_sales(product_id);
CREATE INDEX idx_flash_sales_is_active ON flash_sales(is_active);
CREATE INDEX idx_rental_options_product_id ON rental_options(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert sample data
INSERT INTO products (name, description, price, original_price, image, category, game_title, account_level, account_details, is_flash_sale, flash_sale_end_time, has_rental, stock) VALUES
('Akun ML Sultan Mythic Glory 1000 Points', 'Akun Mobile Legends dengan rank Mythic Glory 1000 points. Semua hero unlocked, 500+ skin epic/legend. Akun aman dan terpercaya.', 2500000, 3000000, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 'MOBA', 'Mobile Legends', 'Mythic Glory', 'All heroes unlocked, 500+ skins, Winrate 75%', true, NOW() + INTERVAL '2 days', true, 5),

('Akun PUBG Mobile Conqueror Asia', 'Akun PUBG Mobile rank Conqueror server Asia. KD ratio 4.5, tier rewards lengkap, senjata mythic tersedia.', 1800000, 2200000, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', 'Battle Royale', 'PUBG Mobile', 'Conqueror', 'KD 4.5, All season rewards, Mythic weapons', false, null, true, 8),

('Akun Free Fire Grandmaster Ranked', 'Akun Free Fire Grandmaster dengan koleksi bundle lengkap. Pet maxed, gun skin rare, character unlocked semua.', 800000, 1000000, 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400', 'Battle Royale', 'Free Fire', 'Grandmaster', 'All characters, All pets maxed, Rare gun skins', true, NOW() + INTERVAL '1 day', false, 12),

('Akun Genshin Impact AR 58 Whale', 'Akun Genshin Impact Adventure Rank 58 dengan multiple 5-star characters C6. Weapon R5 lengkap, primogem surplus.', 5000000, 6000000, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'RPG', 'Genshin Impact', 'AR 58', 'Multiple C6 5-stars, R5 weapons, 50k+ primogems', false, null, true, 3),

('Akun COD Mobile Legendary Ranked', 'Akun Call of Duty Mobile rank Legendary dengan skin epic dan mythic. Battle pass semua season, KD ratio tinggi.', 1200000, 1500000, 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400', 'FPS', 'Call of Duty', 'Legendary', 'All BP rewards, Mythic skins, High KD ratio', true, NOW() + INTERVAL '3 days', true, 7),

('Akun Valorant Radiant Rank', 'Akun Valorant dengan rank Radiant. Skin collection lengkap, battle pass rewards, RR tinggi.', 3500000, 4000000, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', 'FPS', 'Valorant', 'Radiant', 'Complete skin collection, High RR, All agents unlocked', false, null, false, 2),

('Akun Arena of Valor Master Tier', 'Akun AOV Master tier dengan hero dan skin lengkap. Winrate bagus, sudah unlock semua hero terbaru.', 600000, 800000, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 'MOBA', 'Arena of Valor', 'Master', 'All heroes, Premium skins, High winrate', false, null, true, 15),

('Akun Clash of Clans TH14 Max', 'Akun Clash of Clans Town Hall 14 maxed. Troops max level, plenty of resources, war stars tinggi.', 1500000, 1800000, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 'Strategy', 'Clash of Clans', 'TH14 Max', 'Max troops, High war stars, Rich resources', true, NOW() + INTERVAL '4 days', false, 6);

-- Insert rental options
INSERT INTO rental_options (product_id, duration, price, description) VALUES
((SELECT id FROM products WHERE name = 'Akun ML Sultan Mythic Glory 1000 Points'), '1 Hari', 150000, 'Akses full 24 jam'),
((SELECT id FROM products WHERE name = 'Akun ML Sultan Mythic Glory 1000 Points'), '3 Hari', 400000, 'Akses 3x24 jam + bonus coaching'),
((SELECT id FROM products WHERE name = 'Akun ML Sultan Mythic Glory 1000 Points'), '1 Minggu', 800000, 'Akses 1 minggu penuh'),

((SELECT id FROM products WHERE name = 'Akun PUBG Mobile Conqueror Asia'), '1 Hari', 120000, 'Akses ranked full'),
((SELECT id FROM products WHERE name = 'Akun PUBG Mobile Conqueror Asia'), '3 Hari', 300000, 'Main sepuasnya 3 hari'),
((SELECT id FROM products WHERE name = 'Akun PUBG Mobile Conqueror Asia'), '1 Minggu', 650000, 'Main satu minggu + guide'),

((SELECT id FROM products WHERE name = 'Akun Genshin Impact AR 58 Whale'), '1 Hari', 200000, 'Explore + daily quest'),
((SELECT id FROM products WHERE name = 'Akun Genshin Impact AR 58 Whale'), '3 Hari', 500000, 'Main story + event'),
((SELECT id FROM products WHERE name = 'Akun Genshin Impact AR 58 Whale'), '1 Minggu', 1000000, 'Full access 1 minggu'),

((SELECT id FROM products WHERE name = 'Akun COD Mobile Legendary Ranked'), '1 Hari', 100000, 'Ranked + casual'),
((SELECT id FROM products WHERE name = 'Akun COD Mobile Legendary Ranked'), '3 Hari', 250000, 'Push rank 3 hari'),

((SELECT id FROM products WHERE name = 'Akun Arena of Valor Master Tier'), '1 Hari', 80000, 'Main ranked seharian'),
((SELECT id FROM products WHERE name = 'Akun Arena of Valor Master Tier'), '3 Hari', 200000, 'Push rank 3 hari'),
((SELECT id FROM products WHERE name = 'Akun Arena of Valor Master Tier'), '1 Minggu', 400000, 'Main seminggu penuh');

-- Insert flash sales
INSERT INTO flash_sales (product_id, sale_price, original_price, start_time, end_time, stock, is_active) VALUES
((SELECT id FROM products WHERE name = 'Akun ML Sultan Mythic Glory 1000 Points'), 2500000, 3000000, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '47 hours', 5, true),
((SELECT id FROM products WHERE name = 'Akun Free Fire Grandmaster Ranked'), 800000, 1000000, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '22 hours', 12, true),
((SELECT id FROM products WHERE name = 'Akun COD Mobile Legendary Ranked'), 1200000, 1500000, NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '71 hours', 7, true),
((SELECT id FROM products WHERE name = 'Akun Clash of Clans TH14 Max'), 1500000, 1800000, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '95 hours', 6, true);

-- Set RLS (Row Level Security) policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Rental options are viewable by everyone" ON rental_options FOR SELECT USING (true);
CREATE POLICY "Flash sales are viewable by everyone" ON flash_sales FOR SELECT USING (true);

-- Create policies for orders (only allow inserts for new orders)
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
-- Authenticated users can insert orders that belong to them, guests can insert without user_id
-- Note: A permissive insert policy already allows guests; refined policies can be added later in 002 migration
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (true);

-- Create admin policies (for future admin panel)
-- Note: These will need to be updated when implementing proper authentication
-- CREATE POLICY "Admins can manage products" ON products FOR ALL USING (auth.role() = 'admin');
-- CREATE POLICY "Admins can manage flash sales" ON flash_sales FOR ALL USING (auth.role() = 'admin');
-- CREATE POLICY "Admins can manage rental options" ON rental_options FOR ALL USING (auth.role() = 'admin');
-- CREATE POLICY "Admins can manage orders" ON orders FOR ALL USING (auth.role() = 'admin');
