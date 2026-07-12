-- Fase 3b — advisor fixes (post get_advisors de la migración 20260711120000):
--   1) covering index en la FK uploaded_by_user_id (unindexed_foreign_keys).
--   2) fusionar las 2 policies INSERT (client + admin) en una sola con OR
--      (multiple_permissive_policies) — misma semántica, un solo permissive check.
create index if not exists idx_client_assets_uploaded_by_user_id
  on public.client_assets (uploaded_by_user_id);

drop policy if exists "assets insert client" on public.client_assets;
drop policy if exists "assets insert admin" on public.client_assets;
create policy "assets insert own or admin" on public.client_assets
  for insert to authenticated
  with check (
    (
      source = 'client'
      and client_id = private.client_id_of((select auth.uid()))
      and uploaded_by_user_id = (select auth.uid())
    )
    or (
      source = 'admin'
      and private.staff_role_of((select auth.uid())) = 'admin'
      and uploaded_by_user_id = (select auth.uid())
    )
  );
