# Fase 3a — Client Portal (núcleo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el núcleo del portal de clientes (entrega + colaboración): tabla `clients` creada al cerrar un lead, tareas/comentarios, extras de pack con upgrade en dos caminos, provisión de acceso, y notificaciones (Telegram ops + email cliente).

**Architecture:** Capas como en Fases 1-2 — schema+triggers (Supabase) → RLS → Edge Function de notify → guard en `proxy.ts` → capa de servicios → UI admin → UI cliente. Toda validación/autorización vive en la DB (RLS/triggers/guardas), nunca duplicada en cliente. Funciones `SECURITY DEFINER` en schema `private`.

**Tech Stack:** Next.js 16 (`src/proxy.ts`), React 19, Tailwind 4, Supabase (Postgres + Auth + Edge Functions + `pg_net`), Resend (email), Telegram Bot API, Jest.

## Global Constraints

- Funciones `SECURITY DEFINER` → schema `private`, nunca `public` (PostgREST expone `public.*` como RPC a anon/authenticated pese a `revoke`). Idiom: `revoke all on function ... from public, anon, authenticated; grant execute ... to authenticated;`.
- RLS: usar `(select auth.uid())`, nunca `auth.uid()` a secas (evita `auth_rls_initplan` en `get_advisors`).
- Enums como `text ... check (x in (...))`, no `CREATE TYPE` (idiom del repo).
- `get_advisors(type="security")` + `get_advisors(type="performance")` DESPUÉS de cada migración. Sin excepción.
- `jest.mock()` con **rutas relativas**, no el alias `@/*` (no resuelve bajo `next/jest` en este repo).
- Verificación en vivo con cuentas descartables antes de dar cualquier capa por cerrada. Limpiar después.
- Proyecto Supabase `josecoded` (`nrgrmymsjtgayzejtawa`): si está pausado, `restore_project` + poll `get_project` hasta `ACTIVE_HEALTHY` antes de migrar.
- **Respaldar el ADR** (`manage_adr(mode='get')` → archivo) antes de cualquier `index_repository`.
- MFA NO obligatorio para clientes (sí para staff). Clientes entran por invite nativo (`inviteUserByEmail`), no por `/staff/onboarding`.

## File Structure

```
supabase/migrations/
  20260706120000_client_portal_schema.sql      # catálogos, clients, tasks, comments, pack_extras, alters de leads, índices, RLS
  20260706130000_client_portal_triggers.sql    # create extension pg_net; funciones private + triggers
supabase/functions/notify/index.ts             # Edge Function: Telegram ops + email Resend
src/lib/staff-routes.ts                         # + isClientAreaPath (MODIFY)
src/lib/staff-routes.test.ts                    # + tests de isClientAreaPath (MODIFY)
src/proxy.ts                                    # + resolveClientAccess + rama de guard (MODIFY)
src/proxy.test.ts                               # + tests de resolveClientAccess + rama (MODIFY)
src/lib/client-portal/phases.ts                 # helpers puros de fases (orden, labels)
src/lib/client-portal/phases.test.ts
src/services/clients-api.ts                     # servicio client-side (ssr-browser-client)
src/services/clients-api.test.ts
src/app/[locale]/area-clientes/                 # RELOCADO fuera de (site) — layout propio + páginas
  layout.tsx  page.tsx  proyecto/page.tsx  tareas/page.tsx  pack/page.tsx
src/app/[locale]/admin/clientes/                # nuevo
  page.tsx  [id]/page.tsx  [id]/actions.ts      # server actions: provisionAccess, approveExtraDirect, sendExtraToPipeline, rejectExtra
src/app/[locale]/admin/packs/page.tsx           # CRUD catálogos
src/components/client-portal/client-shell.tsx   # shell con nav propia (reusa tokens dash-*)
```

**Interfaces producidas (referencia cruzada entre tareas):**
- `isClientAreaPath(path: string): boolean`
- `resolveClientAccess(supabase): Promise<boolean>`
- `phaseOrder: readonly string[]`, `phaseLabel(p: string): string`, `phaseIndex(p: string): number`
- `clients-api.ts`: `getMyProject()`, `listTasks(clientId)`, `listComments(clientId, taskId?)`, `postComment(clientId, body, taskId?)`, `requestUpgrade(clientId, packExtraId)`, `listPack(clientId)`; admin: `listClients()`, `getClient(id)`, `createTask/updateTask/updatePhase/postAdminComment/addExtra`.

---

## GRUPO 1 — Schema + RLS (migración 1)

### Task 1: Migración de schema (catálogos, clients, tasks, comments, pack_extras, alters, índices, RLS)

**Files:**
- Create: `supabase/migrations/20260706120000_client_portal_schema.sql`

**Interfaces:**
- Produces: tablas `pack_templates`, `pack_extras`, `clients`, `client_tasks`, `client_task_comments`, `client_pack_extras`; columnas `leads.pack_template_id`, `leads.is_upsell`. Consumidas por triggers (Task 3), servicios (Task 8+), UI.

- [ ] **Step 1: Escribir la migración** (calca el idiom de `20260705120000_leads_crm.sql`)

```sql
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
```

- [ ] **Step 2: Aplicar la migración** — `apply_migration` (o `supabase db push`). Confirmar que aplica sin error.

- [ ] **Step 3: `get_advisors` (obligatorio, ambos)**

Run: `get_advisors(project, type="security")` y `get_advisors(project, type="performance")`.
Expected: sin nuevos hallazgos de RLS-init-plan ni FK sin índice. Si aparece alguno, corregir antes de seguir (patrón de Fase 2 — cazó 3 bugs así).

- [ ] **Step 4: Verificación en vivo de RLS** (SQL con `execute_sql` impersonando roles, o cuentas descartables)

Verificar: un cliente NO ve `clients`/tasks/extras de otro; un cliente NO ve comentarios `internal=true`. Admin ve todo.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260706120000_client_portal_schema.sql
git commit -m "feat(3a): client portal schema + RLS (clients, tasks, comments, pack_extras, catalogs)"
```

---

## GRUPO 2 — Triggers (migración 2)

### Task 2: Prerrequisito — deploy de la Edge Function `notify` ANTES de los triggers (review #10)

**Files:** `supabase/functions/notify/index.ts` (ver Task 6 para el contenido completo).

- [ ] **Step 1:** Implementar y desplegar `notify` (Task 6) + setear secrets (`TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`) + cargar al menos un `staff_members.telegram_chat_id` para el admin. **Esto va antes de aplicar la migración de triggers**, o el primer evento postea a un 404 (best-effort lo traga, pero el live-test parece roto).

### Task 3: Migración de triggers (pg_net + funciones private + triggers)

**Files:**
- Create: `supabase/migrations/20260706130000_client_portal_triggers.sql`

**Interfaces:**
- Consumes: tablas de Task 1, `private.staff_role_of` (Fase 2), Edge Function `notify` (Task 6).
- Produces: triggers `trg_zz_client_on_lead_close`, `trg_extra_on_upsell_lost`, `trg_notify_on_comment`, `moddatetime` en clients/tasks.

- [ ] **Step 1: Escribir la migración**

```sql
-- Fase 3a — triggers. pg_net para notify (best-effort). Funciones en `private`.
create extension if not exists pg_net;

-- URL de la Edge Function notify (misma project ref), armada con el ref conocido:
--   https://nrgrmymsjtgayzejtawa.supabase.co/functions/v1/notify
-- IMPORTANTE: desplegar `notify` con verify_jwt DESHABILITADO (config en
-- supabase/config.toml: [functions.notify] verify_jwt = false), porque el
-- trigger la invoca sin un JWT de usuario. Alternativa más estricta: pasar el
-- service_role key por header desde Vault; para MVP, verify_jwt=false + la
-- función solo actúa sobre eventos conocidos (no expone datos).

-- 1) Cliente al cerrar lead / activar extra al cerrar upsell (branch por is_upsell)
create or replace function private.on_lead_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if new.is_upsell then
      update public.client_pack_extras
        set estado = 'activo', monto = coalesce(monto, new.monto)
        where source_lead_id = new.id and estado = 'solicitado';
    else
      insert into public.clients (lead_id, pack_template_id)
        values (new.id, new.pack_template_id)
        on conflict (lead_id) do nothing;
    end if;
    perform private.notify_event('sale.closed', jsonb_build_object('lead_id', new.id, 'is_upsell', new.is_upsell));
  end if;
  return new;
end;
$$;
revoke all on function private.on_lead_close() from public, anon, authenticated;

-- Nombre `zz_` para que ordene DESPUÉS de otros AFTER triggers; el guard
-- financiero de Fase 2 es BEFORE UPDATE (ya committeó la comisión in-row).
drop trigger if exists trg_zz_client_on_lead_close on public.leads;
create trigger trg_zz_client_on_lead_close
  after update of estado on public.leads
  for each row execute function private.on_lead_close();

-- 2) Upsell perdido → extra a 'rechazado' (libera el índice único parcial)
create or replace function private.on_upsell_lost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'perdido' and old.estado is distinct from 'perdido' and new.is_upsell then
    update public.client_pack_extras
      set estado = 'rechazado'
      where source_lead_id = new.id and estado = 'solicitado';
  end if;
  return new;
end;
$$;
revoke all on function private.on_upsell_lost() from public, anon, authenticated;
drop trigger if exists trg_extra_on_upsell_lost on public.leads;
create trigger trg_extra_on_upsell_lost
  after update of estado on public.leads
  for each row execute function private.on_upsell_lost();

-- 3) Notify on comment (email al cliente SOLO si internal=false — review #8)
create or replace function private.on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_is_admin boolean;
begin
  author_is_admin := (private.staff_role_of(new.author_user_id) = 'admin');
  if author_is_admin then
    if new.internal = false then
      perform private.notify_event('comment.admin', jsonb_build_object('comment_id', new.id, 'client_id', new.client_id));
    end if;
  else
    perform private.notify_event('comment.client', jsonb_build_object('comment_id', new.id, 'client_id', new.client_id));
  end if;
  return new;
end;
$$;
revoke all on function private.on_comment_insert() from public, anon, authenticated;
drop trigger if exists trg_notify_on_comment on public.client_task_comments;
create trigger trg_notify_on_comment
  after insert on public.client_task_comments
  for each row execute function private.on_comment_insert();

-- 4) Helper notify_event: pg_net POST best-effort. Nunca bloquea al caller.
create or replace function private.notify_event(event_name text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://nrgrmymsjtgayzejtawa.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event', event_name, 'data', payload)
  );
exception when others then
  -- best-effort: un fallo de notify jamás rompe el insert/cierre (review failure-modes)
  null;
end;
$$;
revoke all on function private.notify_event(text, jsonb) from public, anon, authenticated;

-- 5) moddatetime en clients / client_tasks
create extension if not exists moddatetime;
drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function moddatetime(updated_at);
drop trigger if exists trg_client_tasks_updated_at on public.client_tasks;
create trigger trg_client_tasks_updated_at before update on public.client_tasks
  for each row execute function moddatetime(updated_at);
```

- [ ] **Step 2: Aplicar** + **Step 3: `get_advisors` (ambos)**.
- [ ] **Step 4: Verificación en vivo (lo que Jest NO puede)** con cuentas descartables:
  - Cerrar un lead normal (`is_upsell=false`, con monto) → aparece fila `clients`. Re-cerrar → no duplica.
  - Crear extra `solicitado`, mandarlo a pipeline (Task 9 action), cerrar el lead upsell → extra `activo`, NO se crea cliente fantasma.
  - Marcar el lead upsell `perdido` → extra `rechazado`, y se puede re-pedir el mismo extra.
  - Insertar un comentario admin `internal=true` → NO dispara email al cliente (chequear logs de la función `notify`).
- [ ] **Step 5: Commit** `feat(3a): client portal triggers (client-on-close, upsell activate/reject, notify)`

---

## GRUPO 3 — Notify + acceso

### Task 6: Edge Function `notify`

**Files:** Create `supabase/functions/notify/index.ts`

- [ ] **Step 1:** Implementar (Deno). Recibe `{ event, data }`, resuelve destino y postea. Telegram para ops, Resend para cliente. Usar service-role client para leer `staff_members.telegram_chat_id` / email del cliente.

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { event, data } = await req.json();
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

  const sendTelegram = async (text: string) => {
    const { data: staff } = await supa.from("staff_members").select("telegram_chat_id").eq("role", "admin");
    for (const s of staff ?? []) {
      if (!s.telegram_chat_id) continue;
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: s.telegram_chat_id, text }),
      });
    }
  };
  const sendEmail = async (to: string, subject: string, html: string) => {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "josedev <no-reply@josedev.com>", to, subject, html }),
    });
  };

  try {
    if (event === "comment.client" || event === "sale.closed") {
      await sendTelegram(event === "sale.closed" ? `Venta cerrada (lead ${data.lead_id})` : `Nuevo comentario de cliente`);
    } else if (event === "comment.admin") {
      const { data: c } = await supa.from("clients").select("user_id").eq("id", data.client_id).maybeSingle();
      if (c?.user_id) {
        const { data: u } = await supa.auth.admin.getUserById(c.user_id);
        if (u?.user?.email) await sendEmail(u.user.email, "Tu proyecto tiene una novedad", "<p>Entrá a tu portal para verla.</p>");
      }
    }
  } catch (_e) { /* best-effort */ }
  return new Response("ok");
});
```

- [ ] **Step 2:** `deploy_edge_function` + setear secrets. **Step 3:** smoke test (invocar con un payload de prueba, ver Telegram/email llegar).
- [ ] **Step 4: Commit** `feat(3a): notify edge function (telegram ops + resend client)`

---

## GRUPO 4 — Routing + guard

### Task 7: `isClientAreaPath` + `resolveClientAccess` + rama de guard (TDD)

**Files:** MODIFY `src/lib/staff-routes.ts`, `src/lib/staff-routes.test.ts`, `src/proxy.ts`, `src/proxy.test.ts`

- [ ] **Step 1: Test que falla** — en `staff-routes.test.ts`, agregar:

```ts
describe("isClientAreaPath", () => {
  it("matches the bare path and nested", () => {
    expect(isClientAreaPath("/area-clientes")).toBe(true);
    expect(isClientAreaPath("/area-clientes/tareas")).toBe(true);
  });
  it("does not match prefix collisions", () => {
    expect(isClientAreaPath("/area-clientes-x")).toBe(false);
    expect(isClientAreaPath("/perfil")).toBe(false);
  });
});
```

- [ ] **Step 2:** Correr → falla (no existe `isClientAreaPath`).
- [ ] **Step 3:** Implementar en `staff-routes.ts` (calca `isAdminPath`):

```ts
export function isClientAreaPath(path: string): boolean {
  return path === "/area-clientes" || path.startsWith("/area-clientes/");
}
```

- [ ] **Step 4:** Correr → pasa.
- [ ] **Step 5: Test de `resolveClientAccess`** en `proxy.test.ts` (reusar `makeMockSupabase`, mock de `from("clients").select().eq().maybeSingle()` → `{data:{id}}` para cliente, `{data:null}` para no-cliente, `{error}` para fail-closed). Assert: true / false / false.
- [ ] **Step 6:** Implementar en `proxy.ts`:

```ts
export async function resolveClientAccess(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();
  if (error || !data) return false; // fail-closed
  return true;
}
```

Y en `proxy()`, agregar la rama de client-area (antes del `if (!touchesStaffSurface)` early-return, ampliar la condición). Cuando `isClientAreaPath(bareStaffPath)`: instanciar el `createServerClient`, `const isClient = await resolveClientAccess(supabase)`. Si no hay user → redirect a `/${locale}/auth`. Si user pero `!isClient` → redirect a `/${locale}/perfil`. Si isClient → `response`.

- [ ] **Step 7:** Correr todo el suite → pasa. **Step 8: Commit** `feat(3a): proxy guard for /area-clientes (client access, redirect to /perfil)`

### Task 8: Relocar `/area-clientes` fuera de `(site)` (review A1)

**Files:** mover `src/app/[locale]/(site)/area-clientes/*` → `src/app/[locale]/area-clientes/*`; crear `layout.tsx` (client-shell) + `src/components/client-portal/client-shell.tsx`.

- [ ] **Step 1:** `git mv` del árbol. **Step 2:** crear `layout.tsx` que envuelve en `<ClientShell>`. **Step 3:** `client-shell.tsx` con nav propia (Proyecto/Tareas/Pack/Perfil), reusando tokens `dash-*`, dark-only (DESIGN.md). **Step 4:** correr `next build`/dev, confirmar que `/area-clientes` ya no muestra la nav pública. **Step 5: Commit** `refactor(3a): relocate /area-clientes out of (site) into own shell`

---

## GRUPO 5 — Servicios + Jest

### Task 9: `clients-api.ts` + tests + server actions admin

**Files:** Create `src/services/clients-api.ts`, `src/services/clients-api.test.ts`, `src/app/[locale]/admin/clientes/[id]/actions.ts`

- [ ] **Step 1: Tests que fallan** (`clients-api.test.ts`, mock de `ssr-browser-client` por **ruta relativa** `jest.mock("../lib/supabase/ssr-browser-client", ...)`). Cubrir: `requestUpgrade` inserta con `estado='solicitado'`; `postComment` mapea; `getMyProject` devuelve la fila del cliente; passthrough de error de RLS (silent no-op → resultado vacío).
- [ ] **Step 2-4:** Implementar `clients-api.ts` (client-side, calca `leads-api.ts`: toda validación/authz en DB). Correr → pasa.
- [ ] **Step 5: Server actions** `actions.ts` (server-side, service role, **primera línea re-check admin** vía `resolveStaffRole` — review C2):
  - `provisionAccess(clientId)`: lookup `auth.users` por email del lead (lowercase); existe → link `clients.user_id`; no → `inviteUserByEmail` (try/catch: "ya existe" → link — review #6).
  - `approveExtraDirect(extraId, monto)`: UPDATE `solicitado→activo` + monto.
  - `sendExtraToPipeline(extraId)`: INSERT lead `is_upsell=true`, `monto = pack_extras.precio`, UPDATE extra `source_lead_id`.
  - `rejectExtra(extraId)`: UPDATE `rechazado`.
- [ ] **Step 6:** Test unit de que cada action rechaza a un caller no-admin. **Step 7: Commit** `feat(3a): clients-api service + admin server actions (provision, upgrade paths)`

---

## GRUPO 6 — UI

### Task 10: UI cliente (`/area-clientes/proyecto`, `/tareas`, `/pack`)

**Files:** `src/app/[locale]/area-clientes/{proyecto,tareas,pack}/page.tsx`, `src/lib/client-portal/phases.ts` (+test)

- [ ] **Step 1:** `phases.ts` helpers puros (TDD): `phaseOrder`, `phaseLabel`, `phaseIndex`. Test primero.
- [ ] **Step 2:** `/proyecto`: barra de fases usando `phaseIndex(client.project_phase)`. Consume `getMyProject()`.
- [ ] **Step 3:** `/tareas`: lista `listTasks` + hilos `listComments`; form que llama `postComment`. Estados vacíos.
- [ ] **Step 4:** `/pack`: `listPack` (pack + extras); botón "solicitar upgrade" → `requestUpgrade`. Mostrar estado de cada extra (incluido/solicitado/activo/rechazado).
- [ ] **Step 5:** Verificar en vivo (preview) con una cuenta cliente descartable. **Step 6: Commit** `feat(3a): client portal UI (proyecto, tareas, pack)`

### Task 11: UI admin (`/admin/clientes`, `/admin/clientes/[id]`, `/admin/packs`)

**Files:** `src/app/[locale]/admin/clientes/page.tsx`, `[id]/page.tsx`, `src/app/[locale]/admin/packs/page.tsx`

- [ ] **Step 1:** `/admin/clientes`: tabla `listClients` (Geist tabular). **Step 2:** `[id]`: gestión de fase (`updatePhase`), tareas (`createTask/updateTask`), comentarios con toggle `internal` (`postAdminComment`), extras (aprobar-directo / mandar-a-pipeline / rechazar), botón "crear acceso" (`provisionAccess`). **Step 3:** `/admin/packs`: CRUD de `pack_templates`+`pack_extras`.
- [ ] **Step 4:** Verificar en vivo. **Step 5: Commit** `feat(3a): admin client management + packs CRUD`

---

## GRUPO 7 — Verificación final en vivo

### Task 12: End-to-end con cuentas descartables + regresión de seguridad

- [ ] **Step 1 (CRÍTICO — regresión C1):** cuenta cliente descartable intenta `INSERT client_pack_extras` con `gratis=true` / `monto=100` / `estado='activo'` vía la API REST → RLS lo rechaza. Solo `solicitado` limpio pasa.
- [ ] **Step 2:** flujo completo: lead nuevo con pack → cerrar → cliente creado con pack → provisionar acceso (invite) → login cliente → ve su proyecto/tareas → comenta → admin recibe Telegram → admin responde no-internal → cliente recibe email; admin comenta internal → cliente NO lo ve ni recibe email.
- [ ] **Step 3:** upgrade: cliente solicita extra → admin manda a pipeline → lead upsell asignado por round-robin → cerrar → extra activo (sin cliente fantasma). Otro extra → admin aprueba directo. Otro → rechazar y re-pedir.
- [ ] **Step 4:** `get_advisors` final (ambos). Limpiar cuentas descartables.
- [ ] **Step 5:** Actualizar ADR (`manage_adr`) con lo aprendido de 3a + checkpoint. Commit final.

---

## Paralelización

- **Lane A (secuencial, DB):** Task 1 → Task 3 (Task 3 depende del schema; Task 2/6 notify se despliega entre medio).
- **Lane B (paralelo tras Task 1):** Task 7 (proxy/routing) — módulos distintos (`src/lib`, `src/proxy.ts`).
- **Lane C (tras Task 3 + Task 7):** Task 9 (servicios) → Task 10 + Task 11 (UI, comparten `clients-api` → mismo lane, algo secuencial).
- Task 6 (edge function) es independiente y puede ir en paralelo, pero debe estar desplegada antes de la verificación en vivo de Task 3.
- Task 12 al final, requiere todo.

## NOT in scope
Ver el spec (`docs/superpowers/specs/2026-07-05-fase3a-client-portal-design.md`, sección "Fuera de alcance de 3a"): assets/Storage (3b), facturación (3c), contenido exacto de packs, `/start` auto-registro Telegram, light-mode del portal.
