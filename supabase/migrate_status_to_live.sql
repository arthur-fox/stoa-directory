-- ============================================================
-- Migrate project status from 3 values → 2 values
-- active + shipped → live   |   wip stays wip
-- Run once in the Supabase SQL editor.
-- ============================================================

-- 1. Migrate existing rows first (must happen before constraint change)
update projects
set status = 'live'
where status in ('active', 'shipped');

-- 2. Swap the check constraint
--    Postgres names inline check constraints <table>_<column>_check
alter table projects
  drop constraint if exists projects_status_check;

alter table projects
  add constraint projects_status_check
  check (status in ('wip', 'live'));

-- 3. Update the column default
alter table projects
  alter column status set default 'live';
