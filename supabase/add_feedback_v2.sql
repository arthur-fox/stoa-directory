-- ============================================================
-- Phase 3 v2: feedback prompt on projects + read receipts on feedback
-- Run once in the Supabase SQL editor.
-- ============================================================

-- Let members describe what feedback they want on a project
alter table projects
  add column if not exists feedback_prompt text default '';

-- Track when the project owner has seen each piece of feedback
alter table feedback
  add column if not exists read_at timestamptz;

-- Project owners can mark feedback as read (set read_at)
create policy "Project owners can mark feedback as read"
  on feedback for update
  to authenticated
  using (
    project_id in (
      select p.id from projects p
      join members m on m.id = p.member_id
      where m.user_id = auth.uid()
    )
  )
  with check (true);
