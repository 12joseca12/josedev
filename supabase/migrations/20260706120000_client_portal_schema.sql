-- Fase 3a — Client Portal (núcleo). Ver docs/superpowers/specs/2026-07-05-fase3a-client-portal-design.md
-- Funciones SECURITY DEFINER (triggers) van en 20260706130000, schema `private`.

-- 1) Catálogos de packs y extras (CRUD admin vía /admin/packs)
create table if not exists public.pack_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  precio_base numeric(10, 2),
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pack_extras (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  precio numeric(10, 2),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Alters aditivos de leads (Fase 2) — pack vendido + marcador de upsell
alter table public.leads
  add column if not exists pack_template_id uuid references public.pack_templates (id) on delete set null,
  add column if not exists is_upsell boolean not null default false;

-- 3) clients — entidad de entrega, creada por trigger al cerrar un lead
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  pack_template_id uuid references public.pack_templates (id) on delete set null,
  project_phase text not null default 'briefing'
    check (project_phase in ('briefing', 'diseño', 'desarrollo', 'revision', 'entregado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) client_tasks — ítems gestionados por admin
create table if not exists public.client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  titulo text not null,
  descripcion text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_curso', 'hecho')),
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) client_task_comments — hilo (task_id nullable = comentario general)
create table if not exists public.client_task_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  task_id uuid references public.client_tasks (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete set null,
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6) client_pack_extras — extras por cliente
create table if not exists public.client_pack_extras (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  pack_extra_id uuid not null references public.pack_extras (id) on delete restrict,
  gratis boolean not null default false,
  monto numeric(10, 2),
  estado text not null default 'solicitado'
    check (estado in ('incluido', 'solicitado', 'activo', 'rechazado')),
  source_lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now()
);
-- Único parcial: no duplica un extra vigente/pendiente, pero permite re-pedir uno rechazado.
create unique index if not exists uq_client_pack_extras_vigente
  on public.client_pack_extras (client_id, pack_extra_id)
  where estado in ('incluido', 'solicitado', 'activo');

-- 7) Índices de FK (pre-empt de get_advisors performance)
create index if not exists idx_clients_user_id on public.clients (user_id);
create index if not exists idx_clients_pack_template_id on public.clients (pack_template_id);
create index if not exists idx_client_tasks_client_id on public.client_tasks (client_id);
create index if not exists idx_client_task_comments_client_id on public.client_task_comments (client_id);
create index if not exists idx_client_task_comments_task_id on public.client_task_comments (task_id);
create index if not exists idx_client_pack_extras_client_id on public.client_pack_extras (client_id);
create index if not exists idx_client_pack_extras_pack_extra_id on public.client_pack_extras (pack_extra_id);
create index if not exists idx_client_pack_extras_source_lead_id on public.client_pack_extras (source_lead_id);
create index if not exists idx_leads_pack_template_id on public.leads (pack_template_id);

-- 8) RLS
alter table public.pack_templates enable row level security;
alter table public.pack_extras enable row level security;
alter table public.clients enable row level security;
alter table public.client_tasks enable row level security;
alter table public.client_task_comments enable row level security;
alter table public.client_pack_extras enable row level security;

-- Catálogos: cliente lee activos, admin CRUD.
drop policy if exists "read active pack_templates" on public.pack_templates;
create policy "read active pack_templates" on public.pack_templates
  for select to authenticated
  using (activo = true or private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin manage pack_templates" on public.pack_templates;
create policy "admin manage pack_templates" on public.pack_templates
  for all to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');
-- (idéntico par para pack_extras — repetir con el nombre de tabla cambiado)
drop policy if exists "read active pack_extras" on public.pack_extras;
create policy "read active pack_extras" on public.pack_extras
  for select to authenticated
  using (activo = true or private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin manage pack_extras" on public.pack_extras;
create policy "admin manage pack_extras" on public.pack_extras
  for all to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');

-- clients: cliente ve su fila (sin UPDATE); admin todo.
drop policy if exists "client reads own client" on public.clients;
create policy "client reads own client" on public.clients
  for select to authenticated
  using (user_id = (select auth.uid()) or private.staff_role_of((select auth.uid())) = 'admin');
drop policy if exists "admin manage clients" on public.clients;
create policy "admin manage clients" on public.clients
  for all to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');

-- client_tasks: cliente lee las de su cliente; admin todo.
drop policy if exists "client reads own tasks" on public.client_tasks;
create policy "client reads own tasks" on public.client_tasks
  for select to authenticated
  using (
    client_id in (select id from public.clients where user_id = (select auth.uid()))
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
drop policy if exists "admin manage tasks" on public.client_tasks;
create policy "admin manage tasks" on public.client_tasks
  for all to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');

-- client_task_comments: cliente ve NO-internas de su cliente; INSERT endurecido.
drop policy if exists "client reads shared comments" on public.client_task_comments;
create policy "client reads shared comments" on public.client_task_comments
  for select to authenticated
  using (
    (internal = false and client_id in (select id from public.clients where user_id = (select auth.uid())))
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
drop policy if exists "client posts shared comment" on public.client_task_comments;
create policy "client posts shared comment" on public.client_task_comments
  for insert to authenticated
  with check (
    internal = false
    and author_user_id = (select auth.uid())
    and client_id in (select id from public.clients where user_id = (select auth.uid()))
  );
drop policy if exists "admin manage comments" on public.client_task_comments;
create policy "admin manage comments" on public.client_task_comments
  for all to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (
    private.staff_role_of((select auth.uid())) = 'admin'
    and author_user_id = (select auth.uid())
  );

-- client_pack_extras: cliente ve los suyos; INSERT solo 'solicitado' limpio (review C1); admin todo.
drop policy if exists "client reads own extras" on public.client_pack_extras;
create policy "client reads own extras" on public.client_pack_extras
  for select to authenticated
  using (
    client_id in (select id from public.clients where user_id = (select auth.uid()))
    or private.staff_role_of((select auth.uid())) = 'admin'
  );
drop policy if exists "client requests extra" on public.client_pack_extras;
create policy "client requests extra" on public.client_pack_extras
  for insert to authenticated
  with check (
    estado = 'solicitado'
    and gratis = false
    and monto is null
    and source_lead_id is null
    and client_id in (select id from public.clients where user_id = (select auth.uid()))
    and pack_extra_id in (select id from public.pack_extras where activo = true)
  );
drop policy if exists "admin manage extras" on public.client_pack_extras;
create policy "admin manage extras" on public.client_pack_extras
  for all to authenticated
  using (private.staff_role_of((select auth.uid())) = 'admin')
  with check (private.staff_role_of((select auth.uid())) = 'admin');

-- 9) Seed de los 4 packs base (contenido TBD — slugs estables; nombres editables en /admin/packs)
insert into public.pack_templates (slug, nombre, orden) values
  ('landing', 'Landing', 1),
  ('gestion-logica', '+ Gestión y lógica', 2),
  ('crm-cms', '+ CRM / CMS', 3),
  ('automatizaciones', '+ Automatizaciones e integraciones', 4)
on conflict (slug) do nothing;
