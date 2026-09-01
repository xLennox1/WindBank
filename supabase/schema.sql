-- WindBank database schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('item','kredit')),
  price bigint not null default 0 check (price >= 0),
  stock integer not null default 1 check (stock >= 0),
  seller text not null,
  description text default '',
  image_url text default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','sold_out')),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount bigint not null check (amount > 0),
  interest numeric(6,2) not null default 0 check (interest >= 0),
  term_days integer not null default 30 check (term_days > 0),
  status text not null default 'active' check (status in ('active','closed','pending')),
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;
alter table public.reviews enable row level security;
alter table public.loans enable row level security;

-- Public visitors can only read approved marketplace content.
drop policy if exists "public read approved listings" on public.listings;
create policy "public read approved listings" on public.listings
for select using (status = 'approved' or status = 'sold_out');

drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews
for select using (status = 'approved');

drop policy if exists "public read active loans" on public.loans;
create policy "public read active loans" on public.loans
for select using (status = 'active');

-- Public visitors may submit listings/reviews; they enter as pending and must be approved by the admin.
drop policy if exists "public submit listing" on public.listings;
create policy "public submit listing" on public.listings
for insert with check (status = 'pending');

drop policy if exists "public submit review" on public.reviews;
create policy "public submit review" on public.reviews
for insert with check (status = 'pending');

-- Admin writes must be performed server-side with the Supabase secret key.
-- Never put the Supabase secret key into browser JavaScript.

