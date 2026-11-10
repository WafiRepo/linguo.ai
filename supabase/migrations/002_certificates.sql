-- Digital Certificate (revision P2).
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.
--
-- A certificate is issued by the API (app/api/certificates+api.ts) only when
-- the portfolio shows every topic of a part finished in BOTH Latihan and
-- Role Play. The daily XP goal never issues one.

create table if not exists public.certificates (
  id              uuid primary key default gen_random_uuid(),
  -- Printed on the PDF, e.g. BI-A-7K3QX9MP. Unique, never reused.
  certificate_no  text not null unique,
  user_id         text not null references public.profiles (user_id) on delete cascade,
  part            text not null check (part in ('A', 'B', 'C')),
  student_name    text not null,
  course_title    text not null,
  completed_at    timestamptz not null,       -- when the last required session was finished
  issued_at       timestamptz not null default now(),
  -- Email to a guardian comes later; kept so delivery can be tracked then.
  delivery_status text not null default 'not_sent'
                  check (delivery_status in ('not_sent', 'sent', 'failed')),
  -- One certificate per student per part: prevents duplicate issuance.
  unique (user_id, part)
);

alter table public.certificates enable row level security;
