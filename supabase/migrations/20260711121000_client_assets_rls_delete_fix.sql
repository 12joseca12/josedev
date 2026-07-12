-- Fase 3b — review fix (Critical): alinear el DELETE de storage.objects con la
-- capa 1 (public.client_assets). El DELETE de la tabla es uploader-scoped
-- (uploaded_by_user_id = uid, o admin), pero el de storage.objects estaba
-- folder-scoped (cualquier objeto bajo clients/{client_id}/), lo que dejaba a un
-- cliente borrar los BYTES de un archivo subido por el admin (source='admin')
-- que vive en su carpeta, dejando la fila huérfana. Ahora ambas capas exigen
-- "el que subió, o admin".
--
-- Además (defense-in-depth): CHECK que fuerza storage_path a la carpeta del
-- propio client_id, para que un cliente no pueda insertar una fila cuyo path
-- apunte a la carpeta de otro cliente.

-- 1) Helper SECURITY DEFINER: uploader de un asset por su storage_path.
create or replace function private.asset_uploader_of(path text) returns uuid
  language sql security definer set search_path = public stable
as $$ select uploaded_by_user_id from public.client_assets where storage_path = path limit 1 $$;
revoke all on function private.asset_uploader_of(text) from public, anon, authenticated;
grant execute on function private.asset_uploader_of(text) to authenticated;

-- 2) storage.objects DELETE: uploader-or-admin (concuerda con capa 1).
drop policy if exists "client-assets delete own or admin" on storage.objects;
create policy "client-assets delete own or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      private.staff_role_of((select auth.uid())) = 'admin'
      or private.asset_uploader_of(name) = (select auth.uid())
    )
  );

-- 3) storage_path debe apuntar a la carpeta del propio client_id.
--    Coincide con buildAssetStoragePath(client_id, id) = 'clients/{client_id}/{id}'.
alter table public.client_assets
  add constraint client_assets_storage_path_scope
  check (storage_path = 'clients/' || client_id::text || '/' || id::text);
