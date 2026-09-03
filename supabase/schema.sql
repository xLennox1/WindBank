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
  discord text default '',
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

-- Basen/Farmen: Spieler A fragt einen Stash/eine Farm an, Spieler B nimmt den Auftrag an.
create table if not exists public.base_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('base','farm')),
  requester_name text not null,
  requester_discord text not null,
  description text default '',
  helper_name text default '',
  helper_discord text default '',
  status text not null default 'pending' check (status in ('pending','open','claimed','matched','rejected')),
  created_at timestamptz not null default now()
);

-- Aktivitäten-Leiste: vom Admin manuell nachgetragene abgeschlossene Käufe/Kredite.
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  kind text not null check (kind in ('kauf','kredit')),
  amount bigint not null check (amount >= 0),
  note text default '',
  created_at timestamptz not null default now()
);

-- Rate-Limiting für die API-Routen (Brute-Force-/Spam-Schutz). Nur der Server (Secret-Key)
-- greift hier zu, deshalb absichtlich keine Public-Policies weiter unten.
create table if not exists public.rate_limits (
  id bigserial primary key,
  bucket text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;
alter table public.reviews enable row level security;
alter table public.loans enable row level security;
alter table public.base_requests enable row level security;
alter table public.activity enable row level security;
alter table public.rate_limits enable row level security;

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

drop policy if exists "public read open base requests" on public.base_requests;
create policy "public read open base requests" on public.base_requests
for select using (status = 'open');

drop policy if exists "public read activity" on public.activity;
create policy "public read activity" on public.activity
for select using (true);

-- Public visitors may submit listings/reviews/base requests; they enter as pending
-- (bzw. 'open' entsteht erst durch Admin-Freigabe) und müssen vom Admin freigegeben werden.
drop policy if exists "public submit listing" on public.listings;
create policy "public submit listing" on public.listings
for insert with check (status = 'pending');

drop policy if exists "public submit review" on public.reviews;
create policy "public submit review" on public.reviews
for insert with check (status = 'pending');

drop policy if exists "public submit base request" on public.base_requests;
create policy "public submit base request" on public.base_requests
for insert with check (status = 'pending');

-- Kein Public-Insert/Select auf activity/rate_limits über den anon/publishable Key hinaus als oben
-- definiert -- Schreiben läuft ausschließlich serverseitig mit dem Secret-Key (umgeht RLS ohnehin).

-- Admin writes must be performed server-side with the Supabase secret key.
-- Never put the Supabase secret key into browser JavaScript.
