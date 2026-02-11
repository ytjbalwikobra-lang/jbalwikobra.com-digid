-- Ensure orders table (if not exists) columns mapped to UI
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  order_type text check (order_type in ('purchase','rental')) default 'purchase',
  amount numeric not null,
  status text check (status in ('pending','paid','completed','cancelled')) default 'pending',
  payment_method text check (payment_method in ('xendit','whatsapp')) default 'whatsapp',
  rental_duration text,
  user_id uuid,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

-- Read for authenticated and service role; you can restrict further later
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_read_auth'
  ) then
    create policy orders_read_auth on public.orders for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_write_auth'
  ) then
    create policy orders_write_auth on public.orders for all to authenticated using (true) with check (true);
  end if;
end $$;
