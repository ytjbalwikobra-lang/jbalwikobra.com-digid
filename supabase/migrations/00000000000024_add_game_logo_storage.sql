-- Migration: Add game logo storage support
-- Date: 2025-08-31
-- Description: Add logo_path column for file storage and setup storage bucket

-- 1. Add logo_path column to game_titles table for storing uploaded files
ALTER TABLE game_titles 
ADD COLUMN IF NOT EXISTS logo_path VARCHAR(500);

-- 2. Add comment for documentation
COMMENT ON COLUMN game_titles.logo_url IS 'External URL for game logo (legacy)';
COMMENT ON COLUMN game_titles.logo_path IS 'Path to uploaded logo file in Supabase Storage';

-- 3. Create storage bucket for game logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'game-logos',
    'game-logos', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- 4. Create storage policies for public read access
DO $$
BEGIN
    -- Allow public read access to game logo files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Game logos are publicly readable'
    ) THEN
        CREATE POLICY "Game logos are publicly readable"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'game-logos');
    END IF;

    -- Allow authenticated users to upload game logos (for admin)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can upload game logos'
    ) THEN
        CREATE POLICY "Authenticated users can upload game logos"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'game-logos' 
            AND auth.role() = 'authenticated'
        );
    END IF;

    -- Allow authenticated users to update game logos (for admin)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can update game logos'
    ) THEN
        CREATE POLICY "Authenticated users can update game logos"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'game-logos' 
            AND auth.role() = 'authenticated'
        );
    END IF;

    -- Allow authenticated users to delete game logos (for admin)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated users can delete game logos'
    ) THEN
        CREATE POLICY "Authenticated users can delete game logos"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'game-logos' 
            AND auth.role() = 'authenticated'
        );
    END IF;
END $$;

-- 5. Update the products_with_details view to use the new logo system
-- Drop existing view first to avoid column name conflicts
DROP VIEW IF EXISTS products_with_details;

CREATE VIEW products_with_details AS
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
    COALESCE(
        CASE 
            WHEN gt.logo_path IS NOT NULL AND gt.logo_path != '' 
            THEN format('https://%s.supabase.co/storage/v1/object/public/game-logos/%s', 
                       current_setting('app.settings.project_id', true), 
                       gt.logo_path)
            ELSE gt.logo_url
        END, 
        gt.logo_url
    ) as game_logo_url,
    gt.is_popular as game_is_popular
FROM products p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN game_titles gt ON p.game_title_id = gt.id;

-- 6. Grant permissions
GRANT SELECT ON products_with_details TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_titles TO authenticated;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_titles_logo_path ON game_titles(logo_path) WHERE logo_path IS NOT NULL;

-- Migration completed successfully
