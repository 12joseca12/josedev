-- Fix (round 2): get_advisors(type="performance") tras 20260706130000 seguía
-- marcando "multiple_permissive_policies" para INSERT en
-- client_pack_extras y client_task_comments — ahí la policy de cliente y la
-- de admin insert coexistían como dos policies permisivas separadas para el
-- mismo role+action (a diferencia de las demás tablas, acá sí hay dos
-- with-check distintos que no se resolvían solo separando por acción). Fix
-- real: fusionar ambas en una única policy INSERT con el OR entre la
-- condición de cliente y la de admin, igual que ya hace el patrón de SELECT
-- en el resto de las tablas.

-- client_task_comments: una sola policy de insert, cliente O admin.
drop policy if exists "client posts shared comment" on public.client_task_comments;
drop policy if exists "admin insert comments" on public.client_task_comments;
drop policy if exists "insert comments" on public.client_task_comments;
create policy "insert comments" on public.client_task_comments
  for insert to authenticated
  with check (
    (
      internal = false
      and author_user_id = (select auth.uid())
      and client_id in (select id from public.clients where user_id = (select auth.uid()))
    )
    or (
      private.staff_role_of((select auth.uid())) = 'admin'
      and author_user_id = (select auth.uid())
    )
  );

-- client_pack_extras: una sola policy de insert, cliente O admin.
drop policy if exists "client requests extra" on public.client_pack_extras;
drop policy if exists "admin insert extras" on public.client_pack_extras;
drop policy if exists "insert extras" on public.client_pack_extras;
create policy "insert extras" on public.client_pack_extras
  for insert to authenticated
  with check (
    (
      estado = 'solicitado'
      and gratis = false
      and monto is null
      and source_lead_id is null
      and client_id in (select id from public.clients where user_id = (select auth.uid()))
      and pack_extra_id in (select id from public.pack_extras where activo = true)
    )
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
