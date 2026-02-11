-- Final cleanup and verification migration
-- Note: This keeps old columns for backup - they can be removed later after verification

-- Verify data migration
SELECT 
    p.id,
    p.name,
    p.tier as old_tier,
    t.slug as new_tier_slug,
    p.game_title as old_game_title,
    gt.name as new_game_title_name,
    p.category as old_category,
    gt.category as new_category
FROM products p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN game_titles gt ON p.game_title_id = gt.id
LIMIT 10;

INSERT INTO products (
    name, description, price, original_price, image,
    category, game_title,
    tier_id, game_title_id, account_level, account_details,
    has_rental, stock, is_flash_sale, flash_sale_end_time
)
SELECT
    'Akun Valorant Immortal Rank Dynamic',
    'Akun Valorant Immortal rank dengan skin collection premium dari tabel dinamis.',
    3500000,
    4000000,
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    (SELECT category FROM game_titles WHERE slug = 'valorant'),
    (SELECT name FROM game_titles WHERE slug = 'valorant'),
    (SELECT id FROM tiers WHERE slug = 'premium'),
    (SELECT id FROM game_titles WHERE slug = 'valorant'),
    'Immortal 2',
    'Premium skin collection, All agents unlocked, High RR',
    true,
    3,
    true,
    NOW() + INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Akun Valorant Immortal Rank Dynamic');

INSERT INTO products (
    name, description, price, original_price, image,
    category, game_title,
    tier_id, game_title_id, account_level, account_details,
    has_rental, stock, is_flash_sale, flash_sale_end_time
)
SELECT
    'Akun Genshin Impact AR 50 Student Special',
    'Akun Genshin Impact khusus untuk pelajar dengan harga terjangkau.',
    1200000,
    1500000,
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    (SELECT category FROM game_titles WHERE slug = 'genshin-impact'),
    (SELECT name FROM game_titles WHERE slug = 'genshin-impact'),
    (SELECT id FROM tiers WHERE slug = 'pelajar'),
    (SELECT id FROM game_titles WHERE slug = 'genshin-impact'),
    'AR 50',
    'Multiple 5-star characters, Student discount applied',
    true,
    7,
    false,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Akun Genshin Impact AR 50 Student Special');

INSERT INTO products (
    name, description, price, original_price, image,
    category, game_title,
    tier_id, game_title_id, account_level, account_details,
    has_rental, stock, is_flash_sale, flash_sale_end_time
)
SELECT
    'Akun Mobile Legends Epic Entry Level',
    'Akun Mobile Legends entry level dengan harga terjangkau untuk pemula.',
    350000,
    450000,
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    (SELECT category FROM game_titles WHERE slug = 'mobile-legends'),
    (SELECT name FROM game_titles WHERE slug = 'mobile-legends'),
    (SELECT id FROM tiers WHERE slug = 'reguler'),
    (SELECT id FROM game_titles WHERE slug = 'mobile-legends'),
    'Epic III',
    'Basic heroes unlocked, Perfect for beginners',
    true,
    15,
    false,
    NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Akun Mobile Legends Epic Entry Level');

-- Add rental options for new products
INSERT INTO rental_options (product_id, duration, price, description) VALUES
-- Valorant Immortal rentals
(
    (SELECT id FROM products WHERE name = 'Akun Valorant Immortal Rank Dynamic'),
    '1 Hari', 250000, 'Experience Immortal rank'
),
(
    (SELECT id FROM products WHERE name = 'Akun Valorant Immortal Rank Dynamic'),
    '3 Hari', 650000, 'Competitive gaming weekend'
),
-- Genshin Impact AR 50 rentals
(
    (SELECT id FROM products WHERE name = 'Akun Genshin Impact AR 50 Student Special'),
    '1 Hari', 100000, 'Daily quests and exploration'
),
(
    (SELECT id FROM products WHERE name = 'Akun Genshin Impact AR 50 Student Special'),
    '1 Minggu', 600000, 'Full week access'
),
-- ML Epic rentals  
(
    (SELECT id FROM products WHERE name = 'Akun Mobile Legends Epic Entry Level'),
    '1 Hari', 50000, 'Try Epic rank gameplay'
),
(
    (SELECT id FROM products WHERE name = 'Akun Mobile Legends Epic Entry Level'),
    '3 Hari', 120000, 'Learn and improve'
);

-- Create view for easy product display with joined data
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
ALTER VIEW products_with_details OWNER TO postgres;
GRANT SELECT ON products_with_details TO anon, authenticated;

-- Add comment for documentation
COMMENT ON VIEW products_with_details IS 'Complete product information with tier and game title details for frontend consumption';
