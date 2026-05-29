-- ============================================================
-- Phase 3: Feedback table
-- Run once in the Supabase SQL editor.
-- ============================================================

create table if not exists feedback (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references projects(id) on delete cascade,
  from_member_id uuid references members(id) on delete set null,
  category       text default 'general'
                   check (category in ('general', 'design', 'idea-validation', 'growth', 'technical')),
  content        text not null,
  created_at     timestamp with time zone default now()
);

alter table feedback enable row level security;

-- Logged-in members can submit feedback on projects that are seeking it
create policy "Members can submit feedback"
  on feedback for insert
  to authenticated
  with check (
    from_member_id in (select id from members where user_id = auth.uid())
    and exists (select 1 from projects where id = project_id and seeking_feedback = true)
  );

-- Project owners can read feedback on their own projects
create policy "Project owners can read feedback"
  on feedback for select
  to authenticated
  using (
    project_id in (
      select p.id from projects p
      join members m on m.id = p.member_id
      where m.user_id = auth.uid()
    )
  );

-- Feedback givers can see submissions they made
create policy "Feedback givers can read own submissions"
  on feedback for select
  to authenticated
  using (
    from_member_id in (select id from members where user_id = auth.uid())
  );

-- Admins can do anything
create policy "Admins can manage all feedback"
  on feedback for all
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());
