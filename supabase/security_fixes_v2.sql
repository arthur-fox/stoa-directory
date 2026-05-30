-- ============================================================
-- Security fixes v2
-- Run once in the Supabase SQL editor (after security_fixes.sql).
-- ============================================================


-- ============================================================
-- FIX 5: Lock the account-claim policy
--
-- The old "Users can claim unlinked member row" policy only checked
-- user_id = auth.uid() in WITH CHECK, so a malicious API call could
-- claim the row AND set is_admin = true in one shot.
-- The new policy locks all sensitive columns during claim, exactly
-- like the main update policy does.
-- ============================================================

drop policy if exists "Users can claim unlinked member row" on members;

create policy "Users can claim unlinked member row"
  on members for update
  to authenticated
  using  (lower(email) = lower(auth.jwt() ->> 'email') and user_id is null)
  with check (
    -- Can only set user_id to themselves
    user_id   = auth.uid()
    -- Cannot escalate to admin during claim
    and is_admin  = (select is_admin  from public.members m where m.id = members.id)
    -- Cannot change slug
    and slug      = (select slug      from public.members m where m.id = members.id)
    -- Cannot change email
    and email     is not distinct from (select email     from public.members m where m.id = members.id)
    -- Cannot change listed_at
    and listed_at is not distinct from (select listed_at from public.members m where m.id = members.id)
  );


-- ============================================================
-- FIX 6: Lock feedback updates to read_at only
--
-- The old policy had WITH CHECK (true), meaning project owners
-- could edit content, category, from_member_id etc. via a direct
-- API call. The new policy locks every column except read_at.
-- ============================================================

drop policy if exists "Project owners can mark feedback as read" on feedback;

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
  with check (
    -- All immutable columns must stay unchanged; only read_at may differ
    project_id     is not distinct from (select project_id     from public.feedback f where f.id = feedback.id)
    and from_member_id is not distinct from (select from_member_id from public.feedback f where f.id = feedback.id)
    and category       =                    (select category       from public.feedback f where f.id = feedback.id)
    and content        =                    (select content        from public.feedback f where f.id = feedback.id)
  );
