-- Full-course certificate: issued once parts A, B and C are all finished.
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.

alter table public.certificates drop constraint if exists certificates_part_check;
alter table public.certificates
  add constraint certificates_part_check check (part in ('A', 'B', 'C', 'FULL'));
