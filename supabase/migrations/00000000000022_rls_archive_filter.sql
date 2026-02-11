-- RLS: hide archived products from public (defense-in-depth)
alter table if exists public.products enable row level security;

-- Policy for public storefront: only select active & non-archived
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Products select non-archived'
  ) then
    create policy "Products select non-archived" on public.products
      for select using ( coalesce(is_active, true) = true and archived_at is null );
  end if;
end$$;

-- Admin policy should already allow all ops via public.is_admin; keep both. Postgres ORs policies of the same command.