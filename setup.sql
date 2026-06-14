-- The Indian Poncho Co. — survey database setup
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table public.survey_responses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  answers     jsonb not null,
  email       text,
  phone       text,
  source      text,
  user_agent  text,
  started_at  timestamptz
);

-- Lock the table down: the public website may ONLY insert new rows.
-- Nobody can read, edit, or delete responses through the website key.
alter table public.survey_responses enable row level security;

create policy "public can submit responses"
  on public.survey_responses
  for insert
  to anon
  with check (true);

-- (You view responses through the Supabase dashboard, which uses your
--  owner login — RLS does not restrict the dashboard's Table Editor.)
