-- Optional: website / PWA player display names (pairs with Supabase anonymous auth).
-- Run via Supabase CLI: supabase db push
-- Or paste into SQL Editor in the dashboard.

create table if not exists public.web_profiles (
  id text primary key,
  display_name text not null,
  updated_at timestamptz not null default now()
);

alter table public.web_profiles enable row level security;

-- Anonymous + signed-in users may only read/write their own row (id = auth.uid()::text).
create policy "web_profiles_select_own"
  on public.web_profiles for select
  using (auth.uid() is not null and (auth.uid())::text = id);

create policy "web_profiles_insert_own"
  on public.web_profiles for insert
  with check (auth.uid() is not null and (auth.uid())::text = id);

create policy "web_profiles_update_own"
  on public.web_profiles for update
  using (auth.uid() is not null and (auth.uid())::text = id)
  with check (auth.uid() is not null and (auth.uid())::text = id);
