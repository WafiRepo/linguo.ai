-- Learning Portfolio (revision P1).
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.
--
-- Only the Expo API routes talk to these tables, using the service role key
-- on the server. Row Level Security is ON with no policies, so the public
-- anon key (and anyone without the service key) can read or write nothing.

-- One row per Clerk account. `role` decides who may see whose portfolio:
--   student → only their own
--   teacher → every student (set this by hand in the Table Editor)
create table if not exists public.profiles (
  user_id     text primary key,               -- Clerk user id (user_...)
  role        text not null default 'student'
              check (role in ('student', 'teacher', 'admin')),
  nickname    text,
  class_group text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per finished AI Teacher session (Latihan / Role Play).
create table if not exists public.session_results (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references public.profiles (user_id) on delete cascade,
  -- Made on the phone, so a retried upload never creates a duplicate row.
  client_id        text not null unique,
  topic_id         text not null,
  mode             text not null check (mode in ('practice', 'roleplay')),
  completed        boolean not null default false,
  objectives_done  int not null default 0,
  objectives_total int not null default 0,
  xp_earned        int not null default 0,
  stars            int[] not null default '{}',   -- Latihan: 1–3 per sentence
  praise           text,                           -- AI feedback
  corrections      jsonb not null default '[]',    -- [{said, better, tip}]
  duration_seconds int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists session_results_user_created_idx
  on public.session_results (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.session_results enable row level security;
