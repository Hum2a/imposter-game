-- Optional outcome detail for cloud round history (gameplay v2).
alter table public.player_rounds
  add column if not exists reveal_reason text;

comment on column public.player_rounds.reveal_reason is
  'caught_imposter | wrong_accusation when winner is set; null for older rows or inconclusive.';
