-- Add missing columns to website_settings table
-- This migration adds all columns that are referenced in the code but missing from the database schema

alter table public.website_settings 
add column if not exists support_email text,
add column if not exists business_hours text,
add column if not exists company_description text,
add column if not exists twitter_url text,
add column if not exists youtube_url text,
add column if not exists footer_copyright_text text,
add column if not exists newsletter_enabled boolean default true,
add column if not exists social_media_enabled boolean default true,
add column if not exists topup_game_url text,
add column if not exists whatsapp_channel_url text,
add column if not exists hero_button_url text;

-- Add comments to describe the new columns
comment on column public.website_settings.support_email is 'Support email address for customer inquiries';
comment on column public.website_settings.business_hours is 'Business operating hours';
comment on column public.website_settings.company_description is 'Company description text';
comment on column public.website_settings.twitter_url is 'Twitter/X profile URL';
comment on column public.website_settings.youtube_url is 'YouTube channel URL';
comment on column public.website_settings.footer_copyright_text is 'Copyright text displayed in footer';
comment on column public.website_settings.newsletter_enabled is 'Enable/disable newsletter subscription feature';
comment on column public.website_settings.social_media_enabled is 'Enable/disable social media links';
comment on column public.website_settings.topup_game_url is 'URL for top-up game services';
comment on column public.website_settings.whatsapp_channel_url is 'WhatsApp channel URL for announcements';
comment on column public.website_settings.hero_button_url is 'Main call-to-action button URL on hero section';
