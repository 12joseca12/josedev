-- Chat visitante ↔ superusuario (admin). Escrituras vía API con service_role.

create table if not exists public.admin_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  admin_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.admin_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.admin_chat_conversations (id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'assistant', 'system')),
  sender_id uuid references auth.users (id) on delete set null,
  content text not null default '',
  message_type text not null default 'text' check (message_type in ('text', 'meeting_picker')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_chat_messages_conversation_created
  on public.admin_chat_messages (conversation_id, created_at);

create or replace function public.admin_chat_touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.admin_chat_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_admin_chat_touch on public.admin_chat_messages;
create trigger trg_admin_chat_touch
after insert on public.admin_chat_messages
for each row
execute function public.admin_chat_touch_conversation();

alter table public.admin_chat_conversations enable row level security;
alter table public.admin_chat_messages enable row level security;

drop policy if exists "users read own admin chat conversation" on public.admin_chat_conversations;
create policy "users read own admin chat conversation"
on public.admin_chat_conversations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users read own admin chat messages" on public.admin_chat_messages;
create policy "users read own admin chat messages"
on public.admin_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_chat_conversations c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);
