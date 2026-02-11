-- Create public storage bucket for product images and policies
-- This migration assumes elevated privileges (as in Supabase SQL Editor)

-- Create bucket if missing
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Policies on storage.objects
-- Public read for product-images
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='product-images read public'
  ) then
    create policy "product-images read public" on storage.objects
      for select using ( bucket_id = 'product-images' );
  end if;
end$$;

-- Authenticated can upload into product-images
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='product-images insert auth'
  ) then
    create policy "product-images insert auth" on storage.objects
      for insert to authenticated
      with check ( bucket_id = 'product-images' );
  end if;
end$$;

-- Owners can update/delete their own objects
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='product-images owner modify'
  ) then
    create policy "product-images owner modify" on storage.objects
      for all to authenticated
      using ( bucket_id = 'product-images' and owner = auth.uid() )
      with check ( bucket_id = 'product-images' and owner = auth.uid() );
  end if;
end$$;
