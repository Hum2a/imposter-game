-- Aggregated stats per Supabase user (updated when a row is inserted into player_rounds).
-- RLS: users read/update only their own row; trigger runs as SECURITY DEFINER.

create table if not exists public.player_stats (
  user_id text primary key,
  rounds_played int not null default 0,
  wins_as_crew int not null default 0,
  wins_as_imposter int not null default 0,
  losses_as_crew int not null default 0,
  losses_as_imposter int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists player_stats_user_id_idx on public.player_stats (user_id);

alter table public.player_stats enable row level security;

create policy "player_stats_select_own"
  on public.player_stats for select
  using (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "player_stats_insert_own"
  on public.player_stats for insert
  with check (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "player_stats_update_own"
  on public.player_stats for update
  using (auth.uid() is not null and (auth.uid())::text = user_id)
  with check (auth.uid() is not null and (auth.uid())::text = user_id);

create or replace function public.apply_player_round_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d_rounds int := 1;
  d_wc int := 0;
  d_wi int := 0;
  d_lc int := 0;
  d_li int := 0;
begin
  if new.winner = 'crew' and not new.was_imposter then
    d_wc := 1;
  elsif new.winner = 'imposter' and new.was_imposter then
    d_wi := 1;
  elsif new.winner = 'imposter' and not new.was_imposter then
    d_lc := 1;
  elsif new.winner = 'crew' and new.was_imposter then
    d_li := 1;
  end if;

  insert into public.player_stats (
    user_id,
    rounds_played,
    wins_as_crew,
    wins_as_imposter,
    losses_as_crew,
    losses_as_imposter
  )
  values (new.user_id, d_rounds, d_wc, d_wi, d_lc, d_li)
  on conflict (user_id) do update set
    rounds_played = public.player_stats.rounds_played + excluded.rounds_played,
    wins_as_crew = public.player_stats.wins_as_crew + excluded.wins_as_crew,
    wins_as_imposter = public.player_stats.wins_as_imposter + excluded.wins_as_imposter,
    losses_as_crew = public.player_stats.losses_as_crew + excluded.losses_as_crew,
    losses_as_imposter = public.player_stats.losses_as_imposter + excluded.losses_as_imposter,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists player_rounds_stats_trigger on public.player_rounds;

create trigger player_rounds_stats_trigger
  after insert on public.player_rounds
  for each row
  execute procedure public.apply_player_round_stats();

-- Align aggregates with any rows inserted before this migration existed.
insert into public.player_stats (
  user_id,
  rounds_played,
  wins_as_crew,
  wins_as_imposter,
  losses_as_crew,
  losses_as_imposter
)
select
  pr.user_id,
  count(*)::int,
  sum(case when pr.winner = 'crew' and not pr.was_imposter then 1 else 0 end)::int,
  sum(case when pr.winner = 'imposter' and pr.was_imposter then 1 else 0 end)::int,
  sum(case when pr.winner = 'imposter' and not pr.was_imposter then 1 else 0 end)::int,
  sum(case when pr.winner = 'crew' and pr.was_imposter then 1 else 0 end)::int
from public.player_rounds pr
group by pr.user_id
on conflict (user_id) do update set
  rounds_played = excluded.rounds_played,
  wins_as_crew = excluded.wins_as_crew,
  wins_as_imposter = excluded.wins_as_imposter,
  losses_as_crew = excluded.losses_as_crew,
  losses_as_imposter = excluded.losses_as_imposter,
  updated_at = now();

comment on table public.player_stats is 'Per-user aggregates maintained by trigger on player_rounds inserts.';
