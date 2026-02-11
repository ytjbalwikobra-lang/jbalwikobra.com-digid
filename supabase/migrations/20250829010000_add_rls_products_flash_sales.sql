-- Enable RLS and add policies for products and flash_sales

-- Products
alter table if exists public.products enable row level security;

-- Allow anyone to select products (public storefront)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Products select all'
  ) then
    create policy "Products select all" on public.products
      for select using ( true );
  end if;
end$$;

-- Only admins can insert/update/delete products
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Products admin modify'
  ) then
    create policy "Products admin modify" on public.products
      for all using ( public.is_admin(auth.uid()) )
      with check ( public.is_admin(auth.uid()) );
  end if;
end$$;

-- Flash Sales
alter table if exists public.flash_sales enable row level security;

-- Allow anyone to select active flash sales (frontend filters apply too)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='flash_sales' and policyname='Flash sales select all'
  ) then
    create policy "Flash sales select all" on public.flash_sales
      for select using ( true );
  end if;
end$$;

-- Only admins can insert/update/delete flash sales
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='flash_sales' and policyname='Flash sales admin modify'
  ) then
    create policy "Flash sales admin modify" on public.flash_sales
      for all using ( public.is_admin(auth.uid()) )
      with check ( public.is_admin(auth.uid()) );
  end if;
end$$;
