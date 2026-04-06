-- Read-only views for charts / SQL editor / Metabase. RLS on `player_usage_events` applies when
-- invoked as an authenticated user (each user sees only their aggregates). Service role bypasses RLS
-- for org-wide dashboards.

create or replace view public.v_player_usage_events_daily as
select
  user_id,
  ((created_at at time zone 'UTC')::date) as day_utc,
  event_type,
  count(*)::bigint as event_count
from public.player_usage_events
group by user_id, ((created_at at time zone 'UTC')::date), event_type;

comment on view public.v_player_usage_events_daily is
  'Per-user daily counts by event_type.';

create or replace view public.v_player_usage_round_recorded_daily as
select
  user_id,
  ((created_at at time zone 'UTC')::date) as day_utc,
  count(*)::bigint as rounds_recorded,
  count(*) filter (where coalesce(metadata ->> 'winner', '') = 'crew')::bigint as outcome_crew,
  count(*) filter (where coalesce(metadata ->> 'winner', '') = 'imposter')::bigint as outcome_imposter,
  count(*) filter (where coalesce(metadata ->> 'winner', '') = 'none')::bigint as outcome_none,
  count(*) filter (where coalesce(metadata ->> 'was_imposter', '') = 'true')::bigint as played_as_imposter
from public.player_usage_events
where event_type = 'round_recorded'
group by user_id, ((created_at at time zone 'UTC')::date);

comment on view public.v_player_usage_round_recorded_daily is
  'Daily rollup of round_recorded events with winner / role facets from metadata.';

grant select on public.v_player_usage_events_daily to authenticated, service_role;
grant select on public.v_player_usage_round_recorded_daily to authenticated, service_role;
