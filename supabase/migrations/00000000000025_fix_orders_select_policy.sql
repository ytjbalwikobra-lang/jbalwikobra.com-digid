-- Ensure admin UI (authenticated) can read orders; keep existing stricter policies for others

alter table if exists public.orders enable row level security;

do $$ begin
  -- Provide a permissive read policy for authenticated users so Admin UI can load data
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='orders' and policyname='orders_read_auth'
  ) then
    create policy orders_read_auth on public.orders for select to authenticated using (true);
  end if;
end $$;
