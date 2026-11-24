-- ============================================================
-- Vastra Studio — Fashion Channel (Supabase One-Click Schema)
-- Paste this entire file into Supabase -> SQL Editor -> Run
-- ============================================================

-- 1. Channel Profile Table (single row: id = 'main')
create table if not exists public.channel_profile (
  id text primary key default 'main',
  name text not null default 'Vastra Studio',
  handle text not null default '@vastrastudio.official',
  bio text not null default '',
  verified boolean not null default true,
  followers_count integer not null default 14280,
  avatar text not null default '/images/avatar.jpg',
  banner text not null default '/images/banner.jpg',
  whatsapp text not null default '',
  admin_pin text not null default '1234',
  updated_at timestamptz not null default now()
);

-- 2. Collections Table
create table if not exists public.collections (
  id text primary key,
  name text not null,
  category text not null default 'both',
  cover text not null default '',
  sort_order bigint not null default 0
);

-- 3. Fashion Photos Table
create table if not exists public.fashion_items (
  id text primary key,
  image text not null,
  category text not null default 'ladies',
  collection_id text not null default '',
  sizes jsonb not null default '[]'::jsonb,
  all_sizes boolean not null default false,
  likes integer not null default 0,
  created_at bigint not null
);

create index if not exists fashion_items_created_at_idx
  on public.fashion_items (created_at desc);

-- 4. Enable Row Level Security & Policies
alter table public.channel_profile enable row level security;
alter table public.collections enable row level security;
alter table public.fashion_items enable row level security;

drop policy if exists "Allow public access channel_profile" on public.channel_profile;
create policy "Allow public access channel_profile"
  on public.channel_profile
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public access collections" on public.collections;
create policy "Allow public access collections"
  on public.collections
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow public access fashion_items" on public.fashion_items;
create policy "Allow public access fashion_items"
  on public.fashion_items
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 5. Atomic Like & Follow RPC Functions
create or replace function public.toggle_item_like(p_item_id text, p_delta integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_likes integer;
begin
  update public.fashion_items
  set likes = greatest(0, likes + p_delta)
  where id = p_item_id
  returning likes into new_likes;
  return coalesce(new_likes, 0);
end;
$$;

create or replace function public.toggle_channel_follow(p_delta integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_followers integer;
begin
  update public.channel_profile
  set followers_count = greatest(0, followers_count + p_delta),
      updated_at = now()
  where id = 'main'
  returning followers_count into new_followers;
  return coalesce(new_followers, 0);
end;
$$;

grant execute on function public.toggle_item_like(text, integer) to anon, authenticated;
grant execute on function public.toggle_channel_follow(integer) to anon, authenticated;

-- 6. Public Storage Bucket for Fashion Photos (1 GB free ~ 3,000 - 5,000 photos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fashion-media',
  'fashion-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Public read fashion-media" on storage.objects;
create policy "Public read fashion-media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'fashion-media');

drop policy if exists "Public upload fashion-media" on storage.objects;
create policy "Public upload fashion-media"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'fashion-media');

drop policy if exists "Public update fashion-media" on storage.objects;
create policy "Public update fashion-media"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'fashion-media')
  with check (bucket_id = 'fashion-media');

drop policy if exists "Public delete fashion-media" on storage.objects;
create policy "Public delete fashion-media"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'fashion-media');
