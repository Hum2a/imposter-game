-- Per-user round outcomes (optional). Client inserts after reveal when Supabase session exists.
-- RLS: users may only read/insert rows where user_id = auth.uid()::text.

create table if not exists public.player_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  created_at timestamptz not null default now(),
  round_index int not null,
  winner text not null check (winner in ('crew', 'imposter', 'none')),
  was_imposter boolean not null,
  voted_for text,
  party_room_id text
);

create index if not exists player_rounds_user_created_idx
  on public.player_rounds (user_id, created_at desc);

alter table public.player_rounds enable row level security;

create policy "player_rounds_select_own"
  on public.player_rounds for select
  using (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "player_rounds_insert_own"
  on public.player_rounds for insert
  with check (auth.uid() is not null and (auth.uid())::text = user_id);
