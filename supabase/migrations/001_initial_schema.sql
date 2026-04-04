-- ============================================================================
-- Eczalibur — Phase 17: Initial Supabase Schema
-- Run in Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ─── Custom types ────────────────────────────────────────────────────────────

create type zone_level as enum ('green', 'yellow', 'red');
create type body_area as enum (
  'face', 'neck', 'chest', 'back', 'arms',
  'hands', 'legs', 'feet', 'scalp', 'other'
);
create type parent_relationship as enum ('father', 'mother', 'legal-guardian', 'other');
create type child_gender as enum ('male', 'female', 'neutral');
create type redemption_status as enum ('pending', 'approved', 'denied');

-- ─── child_profiles ──────────────────────────────────────────────────────────
-- One row per Clerk user. Maps 1:1 to ChildProfile in lib/types.ts.

create table child_profiles (
  id              text primary key default gen_random_uuid()::text,
  clerk_user_id   text not null unique,

  -- Parent info
  parent_name         text,
  parent_call_name    text,
  parent_relationship parent_relationship,
  parent_phone        text,

  -- Child info
  name            text not null,
  age             smallint not null check (age between 1 and 18),
  gender          child_gender,
  location        text not null default '',
  diagnosis       text not null default '',

  -- Complex fields stored as JSONB (always read/written as a unit, never filtered in SQL)
  medications     jsonb not null default '[]'::jsonb,
  triggers        jsonb not null default '[]'::jsonb,
  affected_areas  jsonb not null default '[]'::jsonb,
  action_plan     jsonb,  -- null until plan is generated

  onboarding_complete boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_child_profiles_clerk on child_profiles (clerk_user_id);

-- ─── flare_logs ──────────────────────────────────────────────────────────────
-- Append-only log entries. Core analytics table.

create table flare_logs (
  id              text primary key default gen_random_uuid()::text,
  clerk_user_id   text not null,
  child_id        text not null references child_profiles(id) on delete cascade,
  timestamp       timestamptz not null default now(),
  zone            zone_level not null,
  mood_score      smallint not null check (mood_score between 1 and 5),
  affected_areas  jsonb not null default '[]'::jsonb,
  notes           text not null default '',
  photo_uri       text,
  photo_uris      jsonb default '[]'::jsonb,
  points_awarded  integer not null default 0,

  constraint fk_flare_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

create index idx_flare_logs_clerk on flare_logs (clerk_user_id);
create index idx_flare_logs_child on flare_logs (child_id);
create index idx_flare_logs_timestamp on flare_logs (child_id, timestamp desc);

-- ─── prizes ──────────────────────────────────────────────────────────────────
-- Parent-defined prizes for the child to redeem.

create table prizes (
  id              text primary key default gen_random_uuid()::text,
  clerk_user_id   text not null,
  name            text not null,
  description     text not null default '',
  point_cost      integer not null check (point_cost > 0),
  icon            text not null default '',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),

  constraint fk_prizes_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

create index idx_prizes_clerk on prizes (clerk_user_id);

-- ─── redemption_requests ─────────────────────────────────────────────────────
-- Child requests a prize; parent approves/denies.

create table redemption_requests (
  id              text primary key default gen_random_uuid()::text,
  clerk_user_id   text not null,
  child_id        text not null references child_profiles(id) on delete cascade,
  prize_id        text not null references prizes(id) on delete cascade,
  prize_name      text not null,       -- denormalized for display after prize deletion
  point_cost      integer not null,    -- snapshot at time of request
  status          redemption_status not null default 'pending',
  requested_at    timestamptz not null default now(),
  resolved_at     timestamptz,

  constraint fk_redemptions_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

create index idx_redemptions_clerk on redemption_requests (clerk_user_id);
create index idx_redemptions_child on redemption_requests (child_id);

-- ─── points_ledger ───────────────────────────────────────────────────────────
-- Single row per user. Running totals.

create table points_ledger (
  clerk_user_id   text primary key,
  total           integer not null default 0,
  earned          integer not null default 0,
  spent           integer not null default 0,

  constraint fk_points_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

-- ─── quest_completions ───────────────────────────────────────────────────────
-- JSONB map: { "green": [0,2], "yellow": [1], "red": [] }

create table quest_completions (
  clerk_user_id   text primary key,
  completions     jsonb not null default '{"green":[],"yellow":[],"red":[]}'::jsonb,

  constraint fk_quests_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Clerk JWT is verified by Supabase. The `sub` claim = clerk_user_id.
-- clerk_user_id is denormalized on every table to keep RLS policies simple and fast.

alter table child_profiles enable row level security;
alter table flare_logs enable row level security;
alter table prizes enable row level security;
alter table redemption_requests enable row level security;
alter table points_ledger enable row level security;
alter table quest_completions enable row level security;

-- Helper: extract Clerk user ID from JWT sub claim
create or replace function requesting_user_id()
returns text
language sql stable
as $$
  select coalesce(
    auth.jwt() ->> 'sub',
    (current_setting('request.jwt.claims', true)::jsonb) ->> 'sub'
  )
$$;

-- child_profiles policies
create policy "own profile select" on child_profiles for select using (clerk_user_id = requesting_user_id());
create policy "own profile insert" on child_profiles for insert with check (clerk_user_id = requesting_user_id());
create policy "own profile update" on child_profiles for update using (clerk_user_id = requesting_user_id()) with check (clerk_user_id = requesting_user_id());
create policy "own profile delete" on child_profiles for delete using (clerk_user_id = requesting_user_id());

-- flare_logs policies
create policy "own flare_logs select" on flare_logs for select using (clerk_user_id = requesting_user_id());
create policy "own flare_logs insert" on flare_logs for insert with check (clerk_user_id = requesting_user_id());
create policy "own flare_logs update" on flare_logs for update using (clerk_user_id = requesting_user_id());
create policy "own flare_logs delete" on flare_logs for delete using (clerk_user_id = requesting_user_id());

-- prizes policies
create policy "own prizes select" on prizes for select using (clerk_user_id = requesting_user_id());
create policy "own prizes insert" on prizes for insert with check (clerk_user_id = requesting_user_id());
create policy "own prizes update" on prizes for update using (clerk_user_id = requesting_user_id());
create policy "own prizes delete" on prizes for delete using (clerk_user_id = requesting_user_id());

-- redemption_requests policies
create policy "own redemptions select" on redemption_requests for select using (clerk_user_id = requesting_user_id());
create policy "own redemptions insert" on redemption_requests for insert with check (clerk_user_id = requesting_user_id());
create policy "own redemptions update" on redemption_requests for update using (clerk_user_id = requesting_user_id());
create policy "own redemptions delete" on redemption_requests for delete using (clerk_user_id = requesting_user_id());

-- points_ledger policies
create policy "own points select" on points_ledger for select using (clerk_user_id = requesting_user_id());
create policy "own points insert" on points_ledger for insert with check (clerk_user_id = requesting_user_id());
create policy "own points update" on points_ledger for update using (clerk_user_id = requesting_user_id());

-- quest_completions policies
create policy "own quests select" on quest_completions for select using (clerk_user_id = requesting_user_id());
create policy "own quests insert" on quest_completions for insert with check (clerk_user_id = requesting_user_id());
create policy "own quests update" on quest_completions for update using (clerk_user_id = requesting_user_id());

-- ─── updated_at trigger ──────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_child_profiles_updated_at
  before update on child_profiles
  for each row execute function update_updated_at();

-- ─── Enable Realtime ─────────────────────────────────────────────────────────
-- Only tables with cross-device interaction patterns that need instant updates.

alter publication supabase_realtime add table redemption_requests;
alter publication supabase_realtime add table points_ledger;
alter publication supabase_realtime add table prizes;
