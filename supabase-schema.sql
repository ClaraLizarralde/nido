-- Run this in your Supabase SQL editor (supabase.com → SQL Editor)

-- Spaces (tus espacios de interés)
create table if not exists spaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text not null default '🌿',
  color text,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- Bookmarks
create table if not exists bookmarks (
  id uuid default gen_random_uuid() primary key,
  space_id uuid references spaces(id) on delete cascade,
  url text not null,
  title text not null,
  description text,
  image_url text,
  favicon_url text,
  tags text[] default '{}',
  is_favorite boolean default false,
  is_read_later boolean default false,
  created_at timestamptz default now()
);

-- Notes
create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  space_id uuid references spaces(id) on delete cascade,
  title text not null,
  content text default '',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Feed sources
create table if not exists feed_sources (
  id uuid default gen_random_uuid() primary key,
  space_id uuid references spaces(id) on delete cascade,
  name text not null,
  url text not null,
  type text default 'rss' check (type in ('rss', 'youtube', 'blog')),
  favicon_url text,
  created_at timestamptz default now()
);

-- Feed items
create table if not exists feed_items (
  id uuid default gen_random_uuid() primary key,
  feed_source_id uuid references feed_sources(id) on delete cascade,
  space_id uuid references spaces(id) on delete cascade,
  title text not null,
  url text unique not null,
  description text,
  image_url text,
  published_at timestamptz default now(),
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_bookmarks_space on bookmarks(space_id);
create index if not exists idx_notes_space on notes(space_id);
create index if not exists idx_feed_items_space on feed_items(space_id);
create index if not exists idx_feed_items_source on feed_items(feed_source_id);
create index if not exists idx_feed_items_published on feed_items(published_at desc);

-- Disable Row Level Security for personal use (single user)
alter table spaces disable row level security;
alter table bookmarks disable row level security;
alter table notes disable row level security;
alter table feed_sources disable row level security;
alter table feed_items disable row level security;

-- Optional: seed with example spaces
insert into spaces (name, emoji, order_index) values
  ('música', '🎵', 0),
  ('programación', '💻', 1),
  ('inspiración', '🎨', 2)
on conflict do nothing;
