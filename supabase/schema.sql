-- ============================================================
-- Stoa Member Project Directory — Supabase Schema
-- Run this once in the Supabase SQL editor to set up tables and RLS.
-- Seed data lives in separate gitignored SQL files.
-- ============================================================

-- Members table
create table members (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  avatar      text,
  bio         text default '',
  location    text,
  social      jsonb default '{}',
  tags        text[] default '{}',
  visibility  text default 'public' check (visibility in ('public', 'community')),
  user_id     uuid references auth.users(id),
  email       text,
  is_admin    boolean default false,
  created_at  timestamp with time zone default now()
);

-- Projects table
create table projects (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid references members(id) on delete cascade,
  title            text not null,
  description      text default '',
  url              text,
  type             text default 'app',
  tags             text[] default '{}',
  visibility       text default 'community' check (visibility in ('public', 'community')),
  status           text default 'active' check (status in ('active', 'shipped', 'wip')),
  thumbnail        text,
  seeking_feedback boolean default false,
  created_at       timestamp with time zone default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table members enable row level security;
alter table projects enable row level security;

-- ============================================================
-- Admin helper — security definer bypasses RLS to avoid
-- infinite recursion when checking admin status
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

-- ============================================================
-- Members policies
-- ============================================================

-- Anyone can read public members
create policy "Public members visible to all"
  on members for select
  using (visibility = 'public');

-- Logged-in users can read all members
create policy "Authenticated users read all members"
  on members for select
  to authenticated
  using (true);

-- Members can update their own row
create policy "Members update own profile"
  on members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can claim an unclaimed member row matching their email
create policy "Users can claim unlinked member row"
  on members for update
  to authenticated
  using  (lower(email) = lower(auth.jwt() ->> 'email') and user_id is null)
  with check (user_id = auth.uid());

-- Admins can do anything
create policy "Admins can manage all members"
  on members for all
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Projects policies
-- ============================================================

-- Anyone can read public projects
create policy "Public projects visible to all"
  on projects for select
  using (visibility = 'public');

-- Logged-in users can read all projects
create policy "Authenticated users read all projects"
  on projects for select
  to authenticated
  using (true);

-- Members can insert/update/delete their own projects
create policy "Members manage own projects"
  on projects for all
  to authenticated
  using (
    member_id in (select id from members where user_id = auth.uid())
  )
  with check (
    member_id in (select id from members where user_id = auth.uid())
  );

-- Admins can do anything
create policy "Admins can manage all projects"
  on projects for all
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Auto-link trigger: when a user signs in via magic link,
-- find the matching member row by email and set user_id
-- ============================================================
create or replace function public.link_member_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
  set user_id = new.id
  where lower(email) = lower(new.email)
    and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.link_member_on_signup();
