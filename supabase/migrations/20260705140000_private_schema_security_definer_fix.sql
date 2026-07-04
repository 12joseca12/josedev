-- Fix: is_staff_member() (creada en la migración de Capa 1, 20260704120000)
-- quedaba expuesta vía PostgREST (/rest/v1/rpc/is_staff_member) para anon Y
-- authenticated, pese al `revoke ... from public` en su migración original —
-- Supabase otorga EXECUTE a anon/authenticated directamente al crear la
-- función (default privileges), no vía el pseudo-rol "public" de Postgres.
-- Encontrado por get_advisors(type="security") justo después de aplicar la
-- migración de leads/CRM (20260705120000, que ya crea staff_role_of()
-- directo en `private` para no repetir el mismo error).
--
-- Fix real: mover is_staff_member() a un schema "private" que PostgREST no
-- expone en absoluto (no está en el db-schema config). Sigue siendo invocable
-- desde políticas RLS sin problema — Postgres no restringe eso por schema,
-- solo la capa HTTP de PostgREST lo hace.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_staff_member(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff_members where user_id = check_user_id
  );
$$;

revoke all on function private.is_staff_member(uuid) from public, anon, authenticated;
grant execute on function private.is_staff_member(uuid) to authenticated;

-- Repuntar la policy de staff_members a la versión privada. De paso,
-- (select auth.uid()) en vez de auth.uid() a secas — evita reevaluarlo por
-- fila (auth_rls_initplan de get_advisors).
drop policy if exists "staff read staff_members" on public.staff_members;
create policy "staff read staff_members"
on public.staff_members
for select
to authenticated
using (private.is_staff_member((select auth.uid())));

-- Eliminar la versión pública ahora obsoleta.
drop function if exists public.is_staff_member(uuid);
