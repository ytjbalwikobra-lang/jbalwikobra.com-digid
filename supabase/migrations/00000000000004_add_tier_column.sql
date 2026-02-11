-- Add tier column to products table for Regular, Student, Premium categories

-- Add tier enum type
CREATE TYPE product_tier AS ENUM ('reguler', 'pelajar', 'premium');

-- Add tier column to products table
ALTER TABLE products ADD COLUMN tier product_tier DEFAULT 'reguler';

-- Add index for better performance
CREATE INDEX idx_products_tier ON products(tier);

-- Update existing products with tier values based on price ranges
-- Premium: Above 2M IDR
-- Student: 500K - 2M IDR  
-- Regular: Below 500K IDR
UPDATE products SET tier = 'premium' WHERE price >= 2000000;
UPDATE products SET tier = 'pelajar' WHERE price >= 500000 AND price < 2000000;
UPDATE products SET tier = 'reguler' WHERE price < 500000;

-- Add some example products for each tier
INSERT INTO products (name, description, price, original_price, image, category, game_title, account_level, account_details, tier, has_rental, stock) VALUES
-- Regular tier products
('Akun ML Epic Rank Basic', 'Akun Mobile Legends rank Epic dengan hero standar. Cocok untuk pemula yang ingin belajar ranked.', 250000, 350000, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 'MOBA', 'Mobile Legends', 'Epic', '50+ heroes, Beberapa skin basic', 'reguler', true, 20),

('Akun Free Fire Gold Rank', 'Akun Free Fire rank Gold dengan character dasar. Pet level standar, bundle basic tersedia.', 150000, 200000, 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400', 'Battle Royale', 'Free Fire', 'Gold', 'Basic characters, Standard pets', 'reguler', false, 25),

-- Student tier products  
('Akun PUBG Mobile Crown Tier', 'Akun PUBG Mobile rank Crown dengan skin season pass. Cocok untuk mahasiswa gaming enthusiast.', 750000, 900000, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', 'Battle Royale', 'PUBG Mobile', 'Crown', 'Season rewards, Decent KD ratio, Some rare outfits', 'pelajar', true, 10),

('Akun ML Legend Rank Student', 'Akun Mobile Legends rank Legend dengan collection skin yang bagus. Harga spesial untuk pelajar.', 1200000, 1500000, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 'MOBA', 'Mobile Legends', 'Legend', '100+ heroes, 200+ skins, Good winrate', 'pelajar', true, 8),

('Akun Genshin Impact AR 45 Student', 'Akun Genshin Impact Adventure Rank 45 dengan beberapa 5-star character. Harga terjangkau untuk mahasiswa.', 1800000, 2000000, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'RPG', 'Genshin Impact', 'AR 45', 'Multiple 5-star characters, Good weapon collection', 'pelajar', false, 5),

-- Premium tier products (updating description to reflect premium status)
('Akun COD Mobile Pro League', 'Akun Call of Duty Mobile tier profesional dengan semua mythic weapon dan legendary skin. Rank Global Leaderboard.', 4500000, 5000000, 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400', 'FPS', 'Call of Duty', 'Legendary Pro', 'All Mythic weapons, Pro league rewards, Global rank', 'premium', true, 2),

('Akun Valorant Immortal Elite', 'Akun Valorant rank Immortal dengan skin collection premium. Vandal, Phantom, Operator skin legendary lengkap.', 6000000, 7000000, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', 'FPS', 'Valorant', 'Immortal', 'Complete premium skin collection, High RR, Champion rewards', 'premium', false, 1);

-- Add rental options for new products
INSERT INTO rental_options (product_id, duration, price, description) VALUES
-- Regular tier rentals
((SELECT id FROM products WHERE name = 'Akun ML Epic Rank Basic'), '1 Hari', 50000, 'Main ranked sehari'),
((SELECT id FROM products WHERE name = 'Akun ML Epic Rank Basic'), '3 Hari', 120000, 'Push rank 3 hari'),

-- Student tier rentals
((SELECT id FROM products WHERE name = 'Akun PUBG Mobile Crown Tier'), '1 Hari', 80000, 'Main ranked Crown'),
((SELECT id FROM products WHERE name = 'Akun PUBG Mobile Crown Tier'), '3 Hari', 200000, 'Push ke Ace'),

((SELECT id FROM products WHERE name = 'Akun ML Legend Rank Student'), '1 Hari', 100000, 'Main Legend rank'),
((SELECT id FROM products WHERE name = 'Akun ML Legend Rank Student'), '3 Hari', 250000, 'Push ke Mythic'),

-- Premium tier rentals
((SELECT id FROM products WHERE name = 'Akun COD Mobile Pro League'), '1 Hari', 300000, 'Experience pro tier'),
((SELECT id FROM products WHERE name = 'Akun COD Mobile Pro League'), '3 Hari', 750000, 'Pro gaming experience');
