-- Per-user saved custom word lists (pairs). Requires Supabase auth (anonymous, Discord, etc.).
-- RLS: users may only access rows where user_id = auth.uid()::text.

create table if not exists public.saved_word_lists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  pairs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_word_lists_name_len check (char_length(trim(name)) >= 1 and char_length(name) <= 120),
  constraint saved_word_lists_pairs_array check (jsonb_typeof(pairs) = 'array')
);

create index if not exists saved_word_lists_user_updated_idx
  on public.saved_word_lists (user_id, updated_at desc);

alter table public.saved_word_lists enable row level security;

create policy "saved_word_lists_select_own"
  on public.saved_word_lists for select
  using (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "saved_word_lists_insert_own"
  on public.saved_word_lists for insert
  with check (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "saved_word_lists_update_own"
  on public.saved_word_lists for update
  using (auth.uid() is not null and (auth.uid())::text = user_id)
  with check (auth.uid() is not null and (auth.uid())::text = user_id);

create policy "saved_word_lists_delete_own"
  on public.saved_word_lists for delete
  using (auth.uid() is not null and (auth.uid())::text = user_id);
