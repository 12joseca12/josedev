-- P1: admin-chat AI console — ai_enabled toggle, unread tracking, last_message_at, admin RLS
-- Applied to prod (nrgrmymsjtgayzejtawa) via Supabase MCP apply_migration; get_advisors x2 clean.

alter table public.admin_chat_conversations
  add column if not exists ai_enabled        boolean     not null default true,
  add column if not exists admin_last_read_at timestamptz,
  add column if not exists last_message_at    timestamptz not null default now();

-- last_message_at bumped on every new message (SECURITY DEFINER in private, search_path=public)
create or replace function private.bump_admin_chat_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.admin_chat_conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end $$;
revoke all on function private.bump_admin_chat_last_message() from public, anon, authenticated;

drop trigger if exists admin_chat_bump_last_message on public.admin_chat_messages;
create trigger admin_chat_bump_last_message
  after insert on public.admin_chat_messages
  for each row execute function private.bump_admin_chat_last_message();

-- Backfill last_message_at from existing messages (idempotent)
update public.admin_chat_conversations c
   set last_message_at = coalesce(
     (select max(m.created_at) from public.admin_chat_messages m where m.conversation_id = c.id),
     c.created_at);

-- Admin SELECT policies (enable admin realtime + reads; gateway writes via service-role)
drop policy if exists "admins read all admin chat conversations" on public.admin_chat_conversations;
create policy "admins read all admin chat conversations"
  on public.admin_chat_conversations for select to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

drop policy if exists "admins read all admin chat messages" on public.admin_chat_messages;
create policy "admins read all admin chat messages"
  on public.admin_chat_messages for select to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');
