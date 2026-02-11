-- Add new column for dynamic jual akun WhatsApp URL
alter table public.website_settings 
add column if not exists jual_akun_whatsapp_url text;

-- Add comment to describe the column
comment on column public.website_settings.jual_akun_whatsapp_url is 'WhatsApp URL for jual akun button on homepage';