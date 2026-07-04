-- Superusuarios del chat terminal (declaración explícita en BD).

create table if not exists public.admin_superusers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_superusers enable row level security;

-- Solo lectura para usuarios autenticados (saber si son admin); escrituras vía service_role en la API.
drop policy if exists "authenticated read admin superusers" on public.admin_superusers;
create policy "authenticated read admin superusers"
on public.admin_superusers
for select
to authenticated
using (true);

comment on table public.admin_superusers is 'Cuentas que actúan como administrador en el chat terminal.';

-- Sustituye por tu user_id/email en otros entornos si hace falta.
insert into public.admin_superusers (user_id, email)
values (
  '25486629-4071-42bb-9447-0ea776ea53ec',
  'sanchezgaricajosecarlos12@gmail.com'
)
on conflict (user_id) do update set email = excluded.email;
