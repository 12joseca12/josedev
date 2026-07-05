# Fase 3a — Client Portal (núcleo de entrega/colaboración) — Design Spec

Date: 2026-07-05
Branch: main
Status: design approved (brainstorming), pending `/plan-eng-review` + second opinion before implementation
Depends on: Fase 1 (Auth/Roles/MFA, committed `a1879a3`), Fase 2 (Leads/CRM, committed through `e07077c`)

## Contexto y descomposición

La Fase 3 (Client Portal) del design doc integral (`~/.gstack/.../2026-07-04-full-site-redesign-design-v1.md`, Capa 3) abarca **tres subsistemas** con ciclos de vida y riesgos distintos. Se decidió cortarla y construirla en ese orden, cada sub-fase con schema+triggers → UI → tests, verificada en vivo antes de cerrar:

- **3a — Núcleo del portal (ESTE SPEC):** `clients`, `client_tasks`/`client_task_comments`, `client_pack_extras`, catálogos de packs, provisión de acceso, notificaciones.
- **3b — Assets:** `client_assets` + Supabase Storage. Depende de `clients`. Su propio spec.
- **3c — Facturación:** `invoices`, Stripe/Bizum, webhooks. **Su propia pasada `/plan-eng-review` dedicada** (área nueva, integración externa, dinero). Su propio spec.

**Notificaciones** son transversales; el canal se decide una vez acá (3a) y se cablea por evento donde toque.

## Modelo de usuarios (fundacional)

- `auth.users` es el superconjunto: **cualquier usuario autenticado tiene `/perfil`** (comunidad/foro/blog, registrados por el `/auth` público).
- Ser **`client`** es un marcador aparte: existe una fila en `clients` con `user_id = auth.uid()`. Es lo único que desbloquea `/area-clientes/*`. Facturación (3c) queda detrás de ese marcador; `/perfil` no.
- **Provisión de acceso desacoplada de la venta:** el cierre de un lead crea la fila `clients` (`user_id` NULL); el acceso al portal lo da el admin aparte, cuando arranca la entrega. El closer nunca dispara alta de cuenta.

## Sección A — Modelo de datos

Estados como enums libres estilo `leads.estado` (sin validación genérica de transiciones). El **monto de la venta NO se duplica** — vive en el `lead`.

### Catálogos (CRUD admin vía `/admin/packs`)

1. **`pack_templates`** — las 4 plantillas base (Landing / +gestión y lógica / +CRM-CMS / +automatizaciones-integraciones).
   `id, slug (unique), nombre, descripcion, precio_base (numeric nullable — contenido exacto TBD, no bloquea estructura), orden (int), activo (bool), created_at`.
2. **`pack_extras`** — extras a la carta (SEO, ciberseguridad, …).
   `id, slug (unique), nombre, descripcion, precio (numeric nullable), activo (bool), created_at`.

### Entrega

3. **`clients`** — creada por trigger al cerrarse un lead.
   `id, lead_id (FK leads NOT NULL UNIQUE), user_id (FK auth.users NULLABLE), pack_template_id (FK pack_templates NULLABLE), project_phase (enum: briefing|diseño|desarrollo|revision|entregado, default briefing), created_at, updated_at`.
   - `lead_id` **UNIQUE** → cierre idempotente (no duplica clientes si el trigger corre dos veces; re-cerrar ya lo bloquea la guarda financiera de Fase 2).
4. **`client_tasks`** — ítems gestionados por admin.
   `id, client_id (FK NOT NULL), titulo, descripcion (nullable), estado (enum: pendiente|en_curso|hecho, default pendiente), orden (int), created_at, updated_at`.
5. **`client_task_comments`** — hilo de colaboración.
   `id, client_id (FK NOT NULL), task_id (FK client_tasks NULLABLE = comentario general del proyecto), author_user_id (FK auth.users), body (text), internal (bool default false — true = solo admin), created_at`.
6. **`client_pack_extras`** — qué extras tiene cada cliente.
   `id, client_id (FK NOT NULL), pack_extra_id (FK NOT NULL), gratis (bool default false), monto (numeric nullable), estado (enum: incluido|solicitado|activo), source_lead_id (FK leads NULLABLE — si vino de un upsell cerrado), created_at, UNIQUE(client_id, pack_extra_id)`.

### Alters de tablas existentes

7. **`staff_members.telegram_chat_id`** (nullable) — alter de tabla existente (Fase 1).
8. **`leads.pack_template_id`** (FK `pack_templates` nullable) — alter aditivo de Fase 2 (review A3). El closer elige el pack al cerrar la venta (junto al `monto`); el trigger de cierre lo **copia** a `clients.pack_template_id`. Una sola fuente de verdad venta↔entrega. No rompe nada existente en `leads`.

### Índices (review P1 — pre-empt de `get_advisors(performance)`)

`CREATE INDEX` explícito en la migración para toda FK nueva: `client_tasks.client_id`; `client_task_comments.client_id`, `.task_id`; `client_pack_extras.client_id`, `.pack_extra_id`, `.source_lead_id`; `clients.user_id`, `.pack_template_id`; `leads.pack_template_id`. (`clients.lead_id` es UNIQUE → ya indexado.) Fase 2 demostró que omitirlos los cachea `get_advisors` después; se ponen desde la migración inicial.

### Patrones aplicados (del ADR)

- Tres FK nullable siguiendo el patrón del repo: `clients.user_id`, `client_task_comments.task_id`, `client_pack_extras.source_lead_id`.
- **Upsell de extra cierra el círculo con Fase 2:** solicitar upgrade → crea un lead upsell (auto-assign round-robin + comisión, ya en Fase 2) → al cerrarse, el extra pasa a `activo` linkeado por `source_lead_id`. No se duplica lógica de comisión/asignación.

## Sección B — Triggers + RLS

Todas las funciones **`SECURITY DEFINER` en schema `private`** (regla dura del ADR — evita exposición vía `/rest/v1/rpc/*`). `get_advisors(security)` + `(performance)` después de cada migración, sin excepción.

### Triggers (4)

1. **`private.create_client_on_close`** — `AFTER UPDATE ON leads` cuando `estado → 'cerrado'`. Branch:
   - Si existe algún `client_pack_extras WHERE source_lead_id = NEW.id` (era upsell) → flipea esos extras a `estado='activo'`; **no** crea cliente.
   - Si no (venta nueva) → `INSERT INTO clients (lead_id, pack_template_id, ...) VALUES (NEW.id, NEW.pack_template_id, ...) ON CONFLICT (lead_id) DO NOTHING`. Copia el pack desde el lead (review A3). `user_id` queda NULL.
   - En ambos casos emite el evento ops **`sale.closed`** a la Edge Function `notify` (`pg_net`) → Telegram al admin. Es el único emisor de ese evento.
2. **`private.request_upgrade_to_lead`** — `AFTER INSERT ON client_pack_extras` cuando `estado='solicitado'`. Crea un **lead upsell** (dispara solo el auto-assign de Fase 2) y linkea `source_lead_id`. "Upgrade = venta", 100% automático.
3. **`private.notify_on_comment`** — `AFTER INSERT ON client_task_comments` → `pg_net` POST a la Edge Function `notify` (Sección C). `comment.client` → Telegram admin; `comment.admin` (no-internal) → email cliente.
4. **`moddatetime`** estándar en `clients` / `client_tasks` (`updated_at`).

### RLS

Cliente = dueño de su fila `clients`; admin = todo, vía `private.staff_role_of()`; siempre `(select auth.uid())`.

| Tabla | Cliente | Admin |
|---|---|---|
| `clients` | SELECT `user_id = auth.uid()`. **Sin** UPDATE (la fase la controla el admin) | todo |
| `client_tasks` | SELECT de su cliente. Sin insert/update/delete | todo |
| `client_task_comments` | SELECT su cliente **`WHERE internal=false`**; INSERT scoped: `internal=false` + `author_user_id=(select auth.uid())` + **`client_id IN (select id from clients where user_id=(select auth.uid()))`** (review C3 — no comenta en el cliente de otro) | todo; puede setear `internal` |
| `client_pack_extras` | SELECT su cliente; INSERT scoped **endurecido (review C1):** `estado='solicitado'` **Y `gratis=false` Y `monto IS NULL` Y `source_lead_id IS NULL`** Y `client_id` propio Y `pack_extra_id` de un extra `activo`. El extra solo se vuelve `activo` por el trigger de cierre, nunca por el cliente. Sin update/delete | todo |
| `pack_templates` / `pack_extras` | SELECT `activo=true` | CRUD |

- **Frontera de acciones del cliente:** el cliente nunca llama una función `private` (PostgREST no la expone — gotcha ADR). "Solicitar upgrade" es solo un INSERT scoped; la conversión a venta la hace el trigger con derechos elevados. Sin RPC pública ni edge function para el request.
- **Comentarios inmutables** en MVP (sin edit); solo admin borra (moderación).
- La creación de la cuenta `auth.users` (provisión de acceso) es **admin-side vía Admin API** (Sección C), no RLS.

## Sección C — Provisión de acceso + notificaciones

### 1. Provisión de acceso — invite nativo (refina la decisión inicial)

El onboarding de Fase 1 es **de staff** (`/staff/onboarding`, fuerza TOTP) — no aplica a clientes (no son staff, sin MFA obligatorio). Se usa el **invite nativo de Supabase Auth** (`auth.admin.inviteUserByEmail`): el cliente elige su propia contraseña; sin temp-password, sin `/staff/*`, sin `must_change_password` del lado cliente.

Botón "crear acceso" en `/admin/clientes/[id]`:
- Busca `auth.users` por el email del lead. **Existe** (ya era comunidad) → solo linkea `clients.user_id`, no toca su password. **No existe** → `inviteUserByEmail` + setea `user_id`.
- Es una **server action con service role**, no client-side. **(review C2)** La primera línea de la action **re-verifica server-side que `auth.uid()` es admin** (`resolveStaffRole` o equivalente) antes de tocar nada con el service role — una server action es un endpoint público; sin ese chequeo cualquier autenticado podría invitar/linkear cuentas (escalada de privilegios).

### 2. Edge Function `notify` (Deno)

Invocada por `pg_net` desde los triggers. Payload `{ event, ... }`:
- `comment.client` → Telegram al admin. `comment.admin` (no-internal) → email al cliente. `sale.closed` → Telegram ops.
- Resuelve `staff_members.telegram_chat_id` (service role) y postea a `api.telegram.org/bot<TOKEN>/sendMessage`; para email llama a Resend.
- Secrets Supabase: `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`.

### 3. Email cliente — Resend

Transaccional; free tier holgado (100/día). Requiere verificar dominio (SPF/DKIM en DNS de josedev.com). Los mails de **invite/reset** los manda Supabase Auth nativo; Resend es solo para notificaciones de app ("tu proyecto tiene novedad" y, en 3c, facturas). Alternativa: SMTP custom de Supabase (más simple de config, peor DX para mails arbitrarios).

### 4. Telegram

Un bot (BotFather) → token en secrets. Registro de `chat_id` **manual en MVP** (cada staff lo saca de `@userinfobot`, el admin lo carga en su `staff_members`); sin webhook handler. `/start` auto-registro → diferido a TODOS.md.

## Sección D — UI, rutas, verificación

### Rutas cliente (`/area-clientes/*`, gated por tener fila `clients`)

- `/area-clientes` — dashboard (existe, a expandir): fase actual + actividad reciente + pendientes.
- `/area-clientes/proyecto` — visualización de `project_phase` (5 fases).
- `/area-clientes/tareas` — tareas + hilos de comentarios (ve no-internal, puede comentar).
- `/area-clientes/pack` — pack contratado + extras; "solicitar upgrade" (INSERT scoped `estado='solicitado'`).
- `/area-clientes/assets` → 3b; `/area-clientes/facturacion` → 3c: **fuera de 3a**.
- `/perfil` — universal, cualquier autenticado (existe).

### Rutas admin (nuevas)

- `/admin/clientes` + `/admin/clientes/[id]` — listar clientes; gestionar fase, tareas, extras, comentar (toggle `internal`), "crear acceso". Implícitas por "solo admin gestiona tareas/assets".
- `/admin/packs` — CRUD `pack_templates` + `pack_extras`.

### Reubicación de route group (review A1 — BLOQUEANTE)

Hoy `/area-clientes` vive en `src/app/[locale]/(site)/area-clientes/` → hereda el **layout/nav público**. DESIGN.md exige nav propia y distinta para el portal, y `/admin` y `/closer` ya están **fuera** de `(site)` como hijos directos de `[locale]`. **Mover** el árbol a `src/app/[locale]/area-clientes/` con su propio `layout.tsx` (el client-shell). No es agregar una página; es relocar el placeholder existente. (`/perfil` se queda en `(site)`: es universal, nav pública correcta.)

### Guards (`src/proxy.ts` — Next 16, no `middleware.ts`)

Forma exacta (review A2), espejando lo existente:
- Nuevo helper `isClientAreaPath(path)` en `src/lib/staff-routes.ts` (con su test, como `isAdminPath`).
- Nueva `resolveClientAccess(supabase): Promise<boolean>` en `proxy.ts` que espeja `resolveStaffRole` pero query `clients` por `user_id = user.id` (fail-closed: error/no-row → false).
- Ampliar el gate: `proxy()` hoy hace `NextResponse.next()` inmediato si `!touchesStaffSurface` (no instancia Supabase). Se agrega una rama para `isClientAreaPath` que sí instancia el `createServerClient` y llama `resolveClientAccess`.
- `/area-clientes/*`: auth + cliente → allow. Autenticado-no-cliente → **redirect a `/perfil`** (usuario legítimo, no `rewrite` 404 como staff). Sin sesión → redirect a `/auth`.
- `/admin/clientes/*` y `/admin/packs`: caen bajo `isAdminPath` existente → ya guardados, cero cambio de proxy.
- **Dualidad Supabase (gotcha ADR):** `/area-clientes` está detrás del guard → `proxy.ts` debe ver la sesión → usa **`ssr-browser-client.ts` (cookies)**, no el `client.ts` de localStorage. El `/auth` público sigue con `client.ts`.

### Shell y tokens (DESIGN.md)

- El portal cliente tiene **nav propia y distinta** de la de staff (regla DESIGN.md). Reusa estructura/tokens `dash-*` de Fase 2 (densidad compacta, Geist para datos) con ítems de nav de cliente.
- **Tradeoff:** arranca **dark-only** como los dashboards de staff (consistencia + velocidad); el light-mode para clientes lo trae la promoción global de tokens de Fase 4. (Revisitable si se quiere light-mode ya para clientes no técnicos.)

### Capa de servicios (patrón `leads-api.ts`)

- `clients-api.ts` (client-side, `ssr-browser-client`): `getMyProject/listTasks/listComments/postComment/requestUpgrade/listPack`.
- Admin: `listClients/getClient/createTask/updateTask/updatePhase/postAdminComment/addExtra`.
- **`provisionAccess`** aparte, server action con service role (Admin API invite) — no client-side.
- Validación/authz siempre en la DB (RLS/triggers), nunca duplicada en cliente (una fuente de verdad por regla).

### Verificación (las 3 capas del ADR)

- **Jest:** helpers puros (orden de fases, agrupado de tareas, formato) + wrappers de `clients-api` mockeando `ssr-browser-client` por **ruta relativa**, no `@/` (gotcha ADR). **Review:** `resolveClientAccess` (espejo de `proxy.test.ts`, mock de `from/select/eq/maybeSingle`) e `isClientAreaPath` (espejo de `staff-routes.test.ts`, incluye colisión de prefijo tipo `/area-clientes-x`).
- **`get_advisors`** security+performance tras cada migración.
- **En vivo con cuentas descartables** (lo que Jest no puede): trigger cierre→cliente vs branch de upsell, visibilidad RLS (cliente no ve `internal` ni otros clientes), flujo invite/link, request de upgrade generando el lead upsell. **Review C1 (regresión de seguridad, CRÍTICO):** cliente descartable intenta `INSERT client_pack_extras` con `gratis=true` / `monto` arbitrario / `estado='activo'` → la RLS lo rechaza; solo `solicitado` limpio pasa.

## Fuera de alcance de 3a

- `client_assets` / Supabase Storage (3b).
- `invoices` / Stripe / Bizum / webhooks (3c, con su propio `/plan-eng-review`).
- Contenido exacto de cada `pack_template` (TBD, no bloquea estructura).
- `/start` auto-registro de Telegram (→ TODOS.md).
- Light-mode del portal cliente (→ Fase 4, promoción global de tokens).

## Prerrequisitos operativos

- El proyecto Supabase `josecoded` (`nrgrmymsjtgayzejtawa`) se pausa tras ~1 semana idle → `restore_project` + poll `get_project` hasta `ACTIVE_HEALTHY` antes de cualquier migración.
- **Respaldar el ADR** (`manage_adr(mode='get')` → archivo) antes de cualquier `index_repository` (puede borrarlo — gotcha ADR).

## Qué ya existe (reuso verificado contra el código)

- `src/proxy.ts` — `proxy()` + `resolveStaffRole()` (lookup fresco por request, fail-closed, 404 para staff). El portal reusa exactamente ese patrón (nueva `resolveClientAccess`). Verificado.
- `src/lib/staff-routes.ts` — helpers `isAdminPath/isCloserPath/...` con test propio. Se agrega `isClientAreaPath` al mismo módulo. Verificado.
- `src/lib/supabase/ssr-browser-client.ts` — el cliente de cookies que el portal necesita. Verificado.
- `src/app/[locale]/(site)/area-clientes/page.tsx` — placeholder existente; se **reubica** fuera de `(site)` (review A1), no se reconstruye.
- Onboarding de staff (`StaffOnboardingClient`, `/staff/onboarding`) — **NO** se reusa para clientes (es staff-routed + fuerza TOTP); clientes van por invite nativo. Confirmado por qué no reusarlo.
- Pipeline de leads/CRM de Fase 2 — reusado tal cual para upsells (auto-assign + comisión). Sin duplicación.
- Shell/tokens `dash-*` de Fase 2 — reusados para el client-shell (nav distinta).

## Failure modes de los codepaths nuevos

| Codepath | Falla realista | ¿Test? | ¿Error handling? | ¿Silenciosa? |
|---|---|---|---|---|
| `create_client_on_close` | lead cierra dos veces | live + `ON CONFLICT DO NOTHING` | sí (idempotente) | no |
| `request_upgrade_to_lead` | cliente forja `gratis=true` | **live regresión C1** | RLS `WITH CHECK` | no (rechazo visible) |
| `notify_on_comment` (pg_net) | POST a edge function falla | no (best-effort) | el insert NO se bloquea por el fallo del notify | **sí (alerta perdida)** — aceptado MVP |
| `resolveClientAccess` (proxy) | error de lookup | unit | fail-closed → false | no (redirect a /perfil) |
| `provisionAccess` | no-admin llama la action | unit | re-check admin (C2) | no (rechazo) |

Único gap silencioso: la alerta de notificación (pg_net best-effort). Aceptado para MVP; el auto-registro/reintento queda en TODOS.md. No es crítico: no pierde datos, solo puede demorar que te enteres de un comentario.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | skipped | codex no instalado |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_found→folded | 8 issues (3 P1-arch, 3 P1-quality/sec, 2 P2-perf), todos horneados en el spec |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**OUTSIDE VOICE:** codex no instalado → cross-model no corrió. Ofrecido al usuario (instalar codex o spawn de subagente) — pendiente de su decisión.
**VERDICT:** ENG REVIEW hardened — 1 fork resuelto (A3), 7 fixes de seguridad/correctitud/estructura horneados. Listo para pasar a writing-plans. Sin CEO/Design review (no bloqueantes para esta capa de datos+auth).

**UNRESOLVED DECISIONS:**
- Outside voice cross-model (codex/subagente) — el usuario decide si lo corre antes de implementar.
