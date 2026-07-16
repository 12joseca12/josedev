-- P1 advisor fix: merge user + admin SELECT policies into one per table.
-- Clears multiple_permissive_policies + auth_rls_initplan warnings on the admin_chat tables.
-- Uses (select auth.uid()) form to avoid per-row re-evaluation.

drop policy if exists "users read own admin chat conversation" on public.admin_chat_conversations;
drop policy if exists "admins read all admin chat conversations" on public.admin_chat_conversations;
create policy "read admin chat conversations"
  on public.admin_chat_conversations for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.staff_role_of((select auth.uid())) = 'admin'
  );

drop policy if exists "users read own admin chat messages" on public.admin_chat_messages;
drop policy if exists "admins read all admin chat messages" on public.admin_chat_messages;
create policy "read admin chat messages"
  on public.admin_chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.admin_chat_conversations c
      where c.id = admin_chat_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
