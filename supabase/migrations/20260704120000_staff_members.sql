-- Staff (admin/closer): reemplaza admin_superusers con un modelo de roles completo.
-- Ver DESIGN.md / docs/ARCHITECTURE.md — Capa 1 (Auth/Roles/MFA).

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'closer')),
  must_change_password boolean not null default true,
  comision numeric(5,2),
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

-- Lectura: cualquier miembro de staff puede leer la tabla completa (necesario para
-- flujos de reasignación/lista de closers). Escrituras solo vía service_role en la API
-- (alta/baja de closers, cambio de rol) — nunca desde el cliente.
--
-- is_staff_member() es SECURITY DEFINER a propósito: una policy de staff_members que
-- hiciera EXISTS(select ... from staff_members) directo causa recursión infinita en
-- Postgres (RLS se reevalúa para la subquery), y PostgREST lo devuelve como 500
-- "Database error querying schema" — encontrado en vivo probando el login real, no
-- en teoría. La función bypasea RLS solo para este chequeo puntual de pertenencia.
create or replace function public.is_staff_member(check_user_id uuid)
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

revoke all on function public.is_staff_member(uuid) from public;
grant execute on function public.is_staff_member(uuid) to authenticated;

drop policy if exists "staff read staff_members" on public.staff_members;
create policy "staff read staff_members"
on public.staff_members
for select
to authenticated
using (public.is_staff_member(auth.uid()));

comment on table public.staff_members is 'Cuentas de staff (admin/closer) — reemplaza admin_superusers.';

-- Migrar datos existentes desde admin_superusers si los hubiera.
insert into public.staff_members (user_id, email, role, must_change_password)
select user_id, email, 'admin', false
from public.admin_superusers
on conflict (user_id) do nothing;

-- Semilla directa: admin_superusers está vacía en producción (su insert original nunca
-- se aplicó), así que sembramos el admin real desde auth.users por email conocido.
insert into public.staff_members (user_id, email, role, must_change_password)
select id, email, 'admin', false
from auth.users
where email = 'sanchezgaricajosecarlos12@gmail.com'
on conflict (user_id) do nothing;

drop table if exists public.admin_superusers;
