-- Leads/CRM (Capa 2). Ver DESIGN.md / ADR — admin_chat_conversations.admin_id
-- pasa a ser reasignable (assigned_staff_id); nueva tabla leads, separada de
-- conversaciones (puede nacer de una o no).
--
-- Nota: las funciones SECURITY DEFINER (staff_role_of) viven directo en
-- schema `private` desde el arranque — ver 20260705140000 para el porqué
-- (no van en `public`, PostgREST expondría cualquier función ahí como RPC
-- pública incluso con `revoke ... from public`, ya que Supabase otorga
-- EXECUTE a anon/authenticated directo al crear la función).

-- 1) admin_chat_conversations.admin_id -> assigned_staff_id (reasignable)
alter table public.admin_chat_conversations
  rename column admin_id to assigned_staff_id;

-- 2) Helper SECURITY DEFINER reutilizable: rol de staff sin pasar por RLS de
-- staff_members. is_staff_member() (Capa 1, en private.*) ya cubre "es staff
-- sí/no"; esta devuelve el rol en sí para políticas que necesitan distinguir
-- admin/closer.
create schema if not exists private;

create or replace function private.staff_role_of(check_user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.staff_members where user_id = check_user_id;
$$;

revoke all on function private.staff_role_of(uuid) from public, anon, authenticated;
grant execute on function private.staff_role_of(uuid) to authenticated;

-- 3) leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.admin_chat_conversations (id) on delete set null,
  assigned_staff_id uuid references auth.users (id) on delete set null,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'negociando', 'cerrado', 'perdido')),
  fuente text,
  monto numeric(10, 2),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_assigned_staff_id on public.leads (assigned_staff_id);
create index if not exists idx_leads_estado on public.leads (estado);
create index if not exists idx_leads_conversation_id on public.leads (conversation_id);

alter table public.leads enable row level security;

-- Closer ve lo suyo + el pool sin asignar; admin ve todo. Escrituras vía
-- service_role en la API (josecoded-api), salvo el UPDATE de optimistic-locking
-- para reclamar un lead sin asignar, que hace el propio closer autenticado.
-- (select auth.uid()) en vez de auth.uid() a secas: evita que Postgres
-- reevalúe la función por cada fila (auth_rls_initplan de get_advisors).
drop policy if exists "staff read leads" on public.leads;
create policy "staff read leads"
on public.leads
for select
to authenticated
using (
  assigned_staff_id = (select auth.uid())
  or assigned_staff_id is null
  or private.staff_role_of((select auth.uid())) = 'admin'
);

-- Reclamar/transferir leads: cualquier staff (admin o closer) puede tocar
-- CUALQUIER lead — incluye tomar uno del pool sin asignar Y tomar uno ya
-- asignado a OTRO closer directamente (decisión explícita: closers pueden
-- pasarse leads entre sí sin mediar por admin). El WITH CHECK limita a quién
-- se le puede asignar: un closer solo puede asignárselo a sí mismo (tomarlo);
-- solo admin puede asignarlo a un tercero arbitrario. Todo queda auditado en
-- lead_assignments vía trigger, sin importar quién lo dispare.
drop policy if exists "staff claim or update own leads" on public.leads;
create policy "staff claim or update own leads"
on public.leads
for update
to authenticated
using (private.staff_role_of((select auth.uid())) is not null)
with check (
  assigned_staff_id = (select auth.uid())
  or private.staff_role_of((select auth.uid())) = 'admin'
);

comment on table public.leads is 'Pipeline de ventas (Capa 2). Ver DESIGN.md — Arquitectura Capa 2.';

-- 4) lead_assignments (historial de reasignaciones/transferencias)
-- from_staff_id/to_staff_id SIN foreign key a propósito: es un log de
-- auditoría, tiene que sobrevivir a que el usuario referenciado se borre de
-- auth.users más adelante (encontrado en vivo: un FK acá rompía justo el
-- caso que la tabla existe para cubrir — borrar un closer con leads).
create table if not exists public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  from_staff_id uuid,
  to_staff_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_assignments_lead_id on public.lead_assignments (lead_id);
create index if not exists idx_lead_assignments_from_staff_id on public.lead_assignments (from_staff_id);
create index if not exists idx_lead_assignments_to_staff_id on public.lead_assignments (to_staff_id);

alter table public.lead_assignments enable row level security;

drop policy if exists "staff read lead_assignments" on public.lead_assignments;
create policy "staff read lead_assignments"
on public.lead_assignments
for select
to authenticated
using (
  from_staff_id = (select auth.uid())
  or to_staff_id = (select auth.uid())
  or private.staff_role_of((select auth.uid())) = 'admin'
);

comment on table public.lead_assignments is 'Historial de reasignaciones de leads — trazabilidad para disputas de comisión.';

-- 5) Comisión acumulada del closer (ledger guardado, no calculado al vuelo)
alter table public.staff_members
  add column if not exists total_ganado numeric(10, 2) not null default 0;
