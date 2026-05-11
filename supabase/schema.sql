create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  sort_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.scan_folders
add column if not exists sort_index integer;

with ranked_folders as (
  select id, row_number() over (partition by user_id order by created_at asc) - 1 as next_sort_index
  from public.scan_folders
)
update public.scan_folders as folders
set sort_index = ranked_folders.next_sort_index
from ranked_folders
where folders.id = ranked_folders.id
  and folders.sort_index is null;

create table if not exists public.scan_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  brand_name text,
  ingredient_text text not null,
  image_name text,
  created_at timestamptz not null default now(),
  ocr_text text,
  ocr_confidence numeric,
  ocr_source text,
  ocr_status_at_save text,
  analysis jsonb not null,
  profile_snapshot jsonb not null,
  folder_id uuid references public.scan_folders(id) on delete set null,
  folder_ids jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  user_note text
);

-- Migration: add folder_ids to existing tables
alter table public.scan_records
add column if not exists folder_ids jsonb not null default '[]'::jsonb;

-- Back-fill: any row that already has folder_id set should include it in folder_ids
update public.scan_records
set folder_ids = jsonb_build_array(folder_id::text)
where folder_id is not null and folder_ids = '[]'::jsonb;

create table if not exists public.reflection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null references public.scan_records(id) on delete cascade,
  purchase_intent text,
  clarity text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scan_id)
);

alter table public.user_profiles enable row level security;
alter table public.scan_folders enable row level security;
alter table public.scan_records enable row level security;
alter table public.reflection_entries enable row level security;

create policy "users manage own profile"
on public.user_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage own folders"
on public.scan_folders
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage own scans"
on public.scan_records
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users manage own reflections"
on public.reflection_entries
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
