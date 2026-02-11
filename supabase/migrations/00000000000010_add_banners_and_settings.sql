-- Create banners table
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text,
  cta_text text,
  sort_order int default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure updated_at maintenance
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_banners_updated on public.banners;
create trigger trg_banners_updated before update on public.banners
for each row execute function public.set_updated_at();

-- Create website_settings table (singleton)
create table if not exists public.website_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text,
  logo_url text,
  favicon_url text,
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  address text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  hero_title text,
  hero_subtitle text,
  updated_at timestamptz default now()
);

drop trigger if exists trg_settings_updated on public.website_settings;
create trigger trg_settings_updated before update on public.website_settings
for each row execute function public.set_updated_at();

-- RLS
alter table public.banners enable row level security;
alter table public.website_settings enable row level security;

-- Policies: allow read for all, write for authenticated (adjust if you segregate admin role)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='banners' and policyname='banners_read_all'
  ) then
    create policy banners_read_all on public.banners for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='banners' and policyname='banners_write_auth'
  ) then
    create policy banners_write_auth on public.banners for all to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='website_settings' and policyname='settings_read_all'
  ) then
    create policy settings_read_all on public.website_settings for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='website_settings' and policyname='settings_write_auth'
  ) then
    create policy settings_write_auth on public.website_settings for all to authenticated using (true) with check (true);
  end if;
end $$;
