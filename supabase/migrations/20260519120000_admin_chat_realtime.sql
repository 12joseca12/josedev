-- Realtime: notificar inserts/updates de mensajes al visitante (RLS en SELECT).

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_chat_messages'
  ) then
    alter publication supabase_realtime add table public.admin_chat_messages;
  end if;
end $$;

alter table public.admin_chat_messages replica identity full;
