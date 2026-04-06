-- Richer per-round snapshots for authenticated users’ game history UI and future analytics.

alter table public.player_rounds
  add column if not exists was_host boolean not null default false;

alter table public.player_rounds
  add column if not exists player_count int not null default 0;

alter table public.player_rounds
  add column if not exists word_pack_id text;

alter table public.player_rounds
  add column if not exists clue_cycle int;

alter table public.player_rounds
  add column if not exists max_clue_rounds int;

alter table public.player_rounds
  add column if not exists write_seconds int;

alter table public.player_rounds
  add column if not exists vote_was_skip boolean;

alter table public.player_rounds
  add column if not exists imposter_player_id text;

alter table public.player_rounds
  add column if not exists imposter_display_name text;

alter table public.player_rounds
  add column if not exists voted_target_name text;

alter table public.player_rounds
  add column if not exists room_crew_wins int;

alter table public.player_rounds
  add column if not exists room_imposter_wins int;

alter table public.player_rounds
  add column if not exists room_rounds_completed int;

comment on column public.player_rounds.was_host is 'Whether this user was room host when the round ended.';
comment on column public.player_rounds.player_count is 'Non-spectator players in the room at end of round.';
comment on column public.player_rounds.word_pack_id is 'Lobby word pack id when the round was played.';
comment on column public.player_rounds.clue_cycle is 'Final clue cycle index (1-based) when the round ended.';
comment on column public.player_rounds.imposter_display_name is 'Imposter display name snapshot for history.';
comment on column public.player_rounds.voted_target_name is 'Display name snapshot for vote target (not for skip).';
comment on column public.player_rounds.room_crew_wins is 'Room crew win count after this round (lobby stats).';
comment on column public.player_rounds.room_imposter_wins is 'Room imposter win count after this round.';
comment on column public.player_rounds.room_rounds_completed is 'Room rounds completed after this round.';
