-- Fix: get_advisors(type="performance") sobre 20260706120000 encontró
-- "multiple_permissive_policies" (WARN) en las 6 tablas nuevas del client
-- portal — cada una tenía una policy "for select"/"for insert" de cliente MÁS
-- una policy admin "for all" (que incluye select/insert/update/delete), y
-- Postgres evalúa AMBAS policies permisivas por fila cuando coinciden en
-- role+action (incluso si una siempre es true para admin), degradando el
-- plan de RLS. Fix: la policy admin deja de ser "for all" y pasa a policies
-- separadas para insert/update/delete únicamente — select ya lo cubre la
-- policy de lectura de cada tabla (que ya incluye la condición admin en el
-- OR), sin duplicar cobertura select+select para el mismo role.

-- pack_templates
drop policy if exists "admin manage pack_templates" on public.pack_templates;
drop policy if exists "admin insert pack_templates" on public.pack_templates;
create policy "admin insert pack_templates" on public.pack_templates
  for insert to authenticated
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin update pack_templates" on public.pack_templates;
create policy "admin update pack_templates" on public.pack_templates
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin delete pack_templates" on public.pack_templates;
create policy "admin delete pack_templates" on public.pack_templates
  for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

-- pack_extras
drop policy if exists "admin manage pack_extras" on public.pack_extras;
drop policy if exists "admin insert pack_extras" on public.pack_extras;
create policy "admin insert pack_extras" on public.pack_extras
  for insert to authenticated
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin update pack_extras" on public.pack_extras;
create policy "admin update pack_extras" on public.pack_extras
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin delete pack_extras" on public.pack_extras;
create policy "admin delete pack_extras" on public.pack_extras
  for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

-- clients (sin insert admin explícito en el plan original mas allá de "for all";
-- se preserva la misma superficie de permisos, solo separada por acción)
drop policy if exists "admin manage clients" on public.clients;
drop policy if exists "admin insert clients" on public.clients;
create policy "admin insert clients" on public.clients
  for insert to authenticated
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin update clients" on public.clients;
create policy "admin update clients" on public.clients
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin delete clients" on public.clients;
create policy "admin delete clients" on public.clients
  for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

-- client_tasks
drop policy if exists "admin manage tasks" on public.client_tasks;
drop policy if exists "admin insert tasks" on public.client_tasks;
create policy "admin insert tasks" on public.client_tasks
  for insert to authenticated
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin update tasks" on public.client_tasks;
create policy "admin update tasks" on public.client_tasks
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin delete tasks" on public.client_tasks;
create policy "admin delete tasks" on public.client_tasks
  for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

-- client_task_comments (admin también podía insertar vía "for all"; se
-- preserva con la misma restricción author_user_id = auth.uid() del with
-- check original, ahora solo en la policy de insert)
drop policy if exists "admin manage comments" on public.client_task_comments;
drop policy if exists "admin insert comments" on public.client_task_comments;
create policy "admin insert comments" on public.client_task_comments
  for insert to authenticated
  with check (
    private.staff_role_of((select auth.uid())) = 'admin'
    and author_user_id = (select auth.uid())
  );
drop policy if exists "admin update comments" on public.client_task_comments;
create policy "admin update comments" on public.client_task_comments
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (
    private.staff_role_of((select auth.uid())) = 'admin'
    and author_user_id = (select auth.uid())
  );
drop policy if exists "admin delete comments" on public.client_task_comments;
create policy "admin delete comments" on public.client_task_comments
  for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');

-- client_pack_extras
drop policy if exists "admin manage extras" on public.client_pack_extras;
drop policy if exists "admin insert extras" on public.client_pack_extras;
create policy "admin insert extras" on public.client_pack_extras
  for insert to authenticated
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin update extras" on public.client_pack_extras;
create policy "admin update extras" on public.client_pack_extras
  for update to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin delete extras" on public.client_pack_extras;
create policy "admin delete extras" on public.client_pack_extras
  for delete to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin');
