-- ============================================================================
-- Eczalibur — Phase 21b: MAVL Watch Tables
-- Run in Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- ─── watch_configs ───────────────────────────────────────────────────────────
-- One row per parent-defined monitoring period on a specific body area.

create table watch_configs (
  id              text primary key default gen_random_uuid()::text,
  clerk_user_id   text not null,
  child_id        text not null references child_profiles(id) on delete cascade,
  area            text not null,
  duration_days   smallint not null check (duration_days in (7, 14, 21)),
  start_date      date not null default current_date,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),

  constraint fk_watch_configs_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

create index idx_watch_configs_clerk on watch_configs (clerk_user_id);
create index idx_watch_configs_child  on watch_configs (child_id, active);

-- ─── watch_photos ─────────────────────────────────────────────────────────────
-- Photos captured by the child during a watch period.

create table watch_photos (
  id               text primary key default gen_random_uuid()::text,
  clerk_user_id    text not null,
  watch_config_id  text not null references watch_configs(id) on delete cascade,
  photo_url        text not null,
  timestamp        timestamptz not null default now(),
  area             text not null,
  notes            text,
  created_at       timestamptz not null default now(),

  constraint fk_watch_photos_clerk foreign key (clerk_user_id)
    references child_profiles(clerk_user_id) on delete cascade
);

create index idx_watch_photos_clerk  on watch_photos (clerk_user_id);
create index idx_watch_photos_config on watch_photos (watch_config_id, timestamp asc);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table watch_configs enable row level security;
alter table watch_photos  enable row level security;

-- watch_configs policies
create policy "own watch_configs select" on watch_configs for select using (clerk_user_id = requesting_user_id());
create policy "own watch_configs insert" on watch_configs for insert with check (clerk_user_id = requesting_user_id());
create policy "own watch_configs update" on watch_configs for update using (clerk_user_id = requesting_user_id()) with check (clerk_user_id = requesting_user_id());
create policy "own watch_configs delete" on watch_configs for delete using (clerk_user_id = requesting_user_id());

-- watch_photos policies
create policy "own watch_photos select" on watch_photos for select using (clerk_user_id = requesting_user_id());
create policy "own watch_photos insert" on watch_photos for insert with check (clerk_user_id = requesting_user_id());
create policy "own watch_photos delete" on watch_photos for delete using (clerk_user_id = requesting_user_id());
