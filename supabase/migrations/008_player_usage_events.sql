-- Optional usage / analytics events (separate from player_rounds). Insert from the client when you
-- want funnel or feature metrics without widening the rounds table.

create table if not exists public.player_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  created_at timestamptz not null default now(),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists player_usage_events_user_created_idx
  on public.player_usage_events (user_id, created_at desc);

create index if not exists player_usage_events_type_idx
  on public.player_usage_events (event_type, created_at desc);

alter table public.player_usage_events enable row level security;

create policy "player_usage_events_select_own"
  on public.player_usage_events for select
  using (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "player_usage_events_insert_own"
  on public.player_usage_events for insert
  with check (auth.uid() is not null and (auth.uid())::text = user_id);

comment on table public.player_usage_events is
  'Append-only style events for product analytics; RLS limits to auth user.';
