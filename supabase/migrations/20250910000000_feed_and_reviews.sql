-- Feed schema: posts, media, reactions, comments, reviews
-- Idempotent-ish guards using IF NOT EXISTS patterns where feasible

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_pinned boolean default false,
  is_hidden boolean default false
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check (type in ('image','video')),
  url text not null,
  position int default 0,
  created_at timestamptz default now()
);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz default now(),
  primary key (post_id, user_id, type)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Simple product reviews associated to existing orders/products
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, product_id)
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists set_post_comments_updated_at on public.post_comments;
create trigger set_post_comments_updated_at before update on public.post_comments
for each row execute function public.set_updated_at();

drop trigger if exists set_product_reviews_updated_at on public.product_reviews;
create trigger set_product_reviews_updated_at before update on public.product_reviews
for each row execute function public.set_updated_at();

-- Indexes for feed performance & pagination
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_post_media_post on public.post_media (post_id, position);
create index if not exists idx_post_reactions_post on public.post_reactions (post_id);
create index if not exists idx_post_comments_post_created on public.post_comments (post_id, created_at);
create index if not exists idx_product_reviews_product on public.product_reviews (product_id, created_at);

-- RPC helpers for batched counts (stable, cache-friendly)
create or replace function public.get_post_like_counts(p_ids uuid[])
returns table(post_id uuid, count bigint) as $$
  select post_id, count(*)::bigint from public.post_reactions where type = 'like' and post_id = any(p_ids) group by post_id;
$$ language sql stable;

create or replace function public.get_post_comment_counts(p_ids uuid[])
returns table(post_id uuid, count bigint) as $$
  select post_id, count(*)::bigint from public.post_comments where post_id = any(p_ids) group by post_id;
$$ language sql stable;

-- RLS policies
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.product_reviews enable row level security;

-- Helper: is_admin from profiles (created earlier migration)
create or replace function public.is_admin(uid uuid)
returns boolean as $$
  select coalesce((select role from public.profiles where id = uid), 'user') in ('admin','superadmin','super-admin','owner');
$$ language sql stable;

-- Posts: anyone can read visible posts; only admin can create/update/hide
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname='posts select visible'
  ) then
    create policy "posts select visible" on public.posts for select
      using (is_hidden = false or public.is_admin(auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname='posts admin write'
  ) then
    create policy "posts admin write" on public.posts for all
      using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
  end if;
end $$;

-- Post media follows posts (read visible, write admin)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_media' and policyname='post_media select'
  ) then
    create policy "post_media select" on public.post_media for select using (
      exists (select 1 from public.posts p where p.id = post_id and (p.is_hidden = false or public.is_admin(auth.uid())))
    );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_media' and policyname='post_media admin write'
  ) then
    create policy "post_media admin write" on public.post_media for all
      using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
  end if;
end $$;

-- Reactions: any authenticated user can upsert like; cannot react to hidden posts
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_reactions' and policyname='post_reactions select'
  ) then
    create policy "post_reactions select" on public.post_reactions for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_reactions' and policyname='post_reactions insert update delete'
  ) then
    create policy "post_reactions insert update delete" on public.post_reactions for all
      using (
        auth.uid() = user_id and exists(
          select 1 from public.posts p where p.id = post_id and p.is_hidden = false
        )
      ) with check (
        auth.uid() = user_id and exists(
          select 1 from public.posts p where p.id = post_id and p.is_hidden = false
        )
      );
  end if;
end $$;

-- Comments: any authenticated can comment on visible posts; owner can update/delete own
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_comments' and policyname='post_comments select'
  ) then
    create policy "post_comments select" on public.post_comments for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_comments' and policyname='post_comments insert'
  ) then
    create policy "post_comments insert" on public.post_comments for insert with check (
      auth.uid() = user_id and exists(
        select 1 from public.posts p where p.id = post_id and p.is_hidden = false
      )
    );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='post_comments' and policyname='post_comments own update delete'
  ) then
    create policy "post_comments own update delete" on public.post_comments for update using (auth.uid() = user_id);
    create policy "post_comments own delete" on public.post_comments for delete using (auth.uid() = user_id or public.is_admin(auth.uid()));
  end if;
end $$;

-- Reviews: only buyers (with completed orders of product_id) can insert one review; can update own; everyone can read
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_reviews' and policyname='product_reviews select'
  ) then
    create policy "product_reviews select" on public.product_reviews for select using (true);
  end if;
end $$;

-- Assuming orders has buyer id column users_id or profiles id mapping; adapt to your schema
-- Here we allow insert only if exists an orders row matching product_id and user_id (paid/completed)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_reviews' and policyname='product_reviews insert'
  ) then
    create policy "product_reviews insert" on public.product_reviews for insert with check (
      auth.uid() = user_id and exists (
        select 1 from public.orders o where o.user_id = user_id and o.product_id = product_id and o.status in ('paid','completed')
      )
    );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_reviews' and policyname='product_reviews update delete own'
  ) then
    create policy "product_reviews update delete own" on public.product_reviews for all using (auth.uid() = user_id);
  end if;
end $$;
