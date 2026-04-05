-- Optional: link a web profile to a Discord user id (for future cross-save / admin tools).
-- Client updates only when you implement a trusted link flow.

alter table public.web_profiles
  add column if not exists linked_discord_user_id text;

create index if not exists web_profiles_linked_discord_idx
  on public.web_profiles (linked_discord_user_id)
  where linked_discord_user_id is not null;
