-- P1: allow sender_role='admin' on admin_chat_messages (admin manual replies from the console).
-- Task 5's insertAdminMessage writes sender_role='admin'; the original CHECK only allowed
-- ('user','assistant','system'). Widening the allowed set is additive/safe (existing rows unaffected).
-- Applied to prod (nrgrmymsjtgayzejtawa) via Supabase MCP.

alter table public.admin_chat_messages drop constraint if exists admin_chat_messages_sender_role_check;
alter table public.admin_chat_messages add constraint admin_chat_messages_sender_role_check
  check (sender_role in ('user','assistant','system','admin'));
