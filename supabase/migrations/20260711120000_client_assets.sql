-- Fase 3b — Assets / Storage. Ver docs/superpowers/specs/2026-07-11-fase3b-assets-storage-design.md
-- Helper private.client_id_of + client_assets (RLS por client_id) + bucket privado
-- client-assets (RLS en storage.objects por prefijo de ruta) + trigger notify.

-- 1) Helper: usuario logueado → su clients.id (NULL si no es cliente).
create or replace function private.client_id_of(uid uuid) returns uuid
  language sql security definer set search_path = public stable
as $$ select id from public.clients where user_id = uid limit 1 $$;
revoke all on function private.client_id_of(uuid) from public, anon, authenticated;
grant execute on function private.client_id_of(uuid) to authenticated;

-- 2) Tabla de metadatos (los bytes viven en Storage).
create table if not exists public.client_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  uploaded_by_user_id uuid references auth.users (id) on delete set null,
  source text not null check (source in ('client', 'admin')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  titulo text,
  descripcion text,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_assets_client_id on public.client_assets (client_id);

-- 3) RLS capa 1 — public.client_assets
alter table public.client_assets enable row level security;

drop policy if exists "assets select own or admin" on public.client_assets;
create policy "assets select own or admin" on public.client_assets
  for select to authenticated
  using (
    client_id = private.client_id_of((select auth.uid()))
    or private.staff_role_of((select auth.uid())) = 'admin'
  );

drop policy if exists "assets insert client" on public.client_assets;
create policy "assets insert client" on public.client_assets
  for insert to authenticated
  with check (
    source = 'client'
    and client_id = private.client_id_of((select auth.uid()))
    and uploaded_by_user_id = (select auth.uid())
  );

drop policy if exists "assets insert admin" on public.client_assets;
create policy "assets insert admin" on public.client_assets
  for insert to authenticated
  with check (
    source = 'admin'
    and private.staff_role_of((select auth.uid())) = 'admin'
    and uploaded_by_user_id = (select auth.uid())
  );

drop policy if exists "assets delete own or admin" on public.client_assets;
create policy "assets delete own or admin" on public.client_assets
  for delete to authenticated
  using (
    uploaded_by_user_id = (select auth.uid())
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
-- Sin UPDATE: assets inmutables.

-- 4) Bucket privado + límites (gate duro). Crear ANTES de las policies de storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-assets', 'client-assets', false, 26214400,
  array[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','application/zip'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- 5) RLS capa 2 — storage.objects (bucket client-assets). Concuerda con capa 1
--    por (foldername)[2] = client_id. path = clients/{client_id}/{asset_id}.
drop policy if exists "client-assets read own or admin" on storage.objects;
create policy "client-assets read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text
      )
      or private.staff_role_of((select auth.uid())) = 'admin'
    )
  );

drop policy if exists "client-assets insert own or admin" on storage.objects;
create policy "client-assets insert own or admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-assets'
    and (
      (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text
      )
      or private.staff_role_of((select auth.uid())) = 'admin'
    )
  );

drop policy if exists "client-assets delete own or admin" on storage.objects;
create policy "client-assets delete own or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      (
        (storage.foldername(name))[1] = 'clients'
        and (storage.foldername(name))[2] = private.client_id_of((select auth.uid()))::text
      )
      or private.staff_role_of((select auth.uid())) = 'admin'
    )
  );

-- 6) Trigger de notificación (best-effort pg_net, mismo patrón que on_comment_insert).
create or replace function private.on_asset_insert()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.source = 'client' then
    perform private.notify_event('asset.uploaded.client',
      jsonb_build_object('client_id', new.client_id, 'asset_id', new.id, 'file_name', new.file_name));
  else
    perform private.notify_event('asset.uploaded.admin',
      jsonb_build_object('client_id', new.client_id, 'asset_id', new.id, 'file_name', new.file_name));
  end if;
  return new;
end;
$$;
revoke all on function private.on_asset_insert() from public, anon, authenticated;

drop trigger if exists trg_on_asset_insert on public.client_assets;
create trigger trg_on_asset_insert
  after insert on public.client_assets
  for each row execute function private.on_asset_insert();
