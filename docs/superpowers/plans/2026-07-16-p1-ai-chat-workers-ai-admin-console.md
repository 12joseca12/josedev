# P1 — AI Chat on Workers AI + Admin Console — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar la respuesta automática del chat 1:1 a Cloudflare Workers AI (knowledge en R2, Ollama fuera del flujo) y construir la consola de admin (chats activos, badges de no-leídos vía Supabase Realtime, toggle de IA por conversación + respuesta manual del admin).

**Architecture:** Se construye sobre el subsistema `admin-chat` existente (tablas `admin_chat_conversations`/`admin_chat_messages`, endpoints `/api/v1/admin-chat/*`, widget terminal). La IA pasa del worker Ollama (`callWorker('/ai/admin-chat')`) a un binding Workers AI en el gateway. El contrato del front NO cambia (`POST /messages` sigue devolviendo `{userMessage, thread}` con la respuesta de IA async, visible al hacer poll de `/thread`). La consola admin es una sección nueva de staff-dash.

**Tech Stack:** Cloudflare Workers (Hono), Workers AI binding, R2, Jest (ts-jest); Supabase (Postgres + RLS + Realtime); Next 16 / React 19 / Tailwind 4 (staff-dash `dash-*`), `@supabase/supabase-js` realtime.

## Global Constraints

- Gateway: `josecoded-api/` (repo `josedev`). Tests: Jest, `pnpm -C josecoded-api test`. Typecheck: `pnpm -C josecoded-api typecheck`. Front: `pnpm test` / `pnpm typecheck` / `pnpm build` desde la raíz.
- **No romper el contrato del front:** `POST /api/v1/admin-chat/messages` sigue devolviendo `ok({ userMessage, thread })` con status 201; la respuesta del asistente se inserta async y el front la ve por `GET /thread`. El shape de `AdminChatMessageDTO`/`AdminChatThreadDTO` no cambia.
- **Supabase project:** `nrgrmymsjtgayzejtawa` (ACTIVE_HEALTHY). Migraciones = tarea gated conducida por el controlador vía Supabase MCP (drift-check + `get_advisors` ×2), NO por subagente; STOP para OK del usuario antes de aplicar (patrón 3b/3c).
- **Idiom migraciones (del ADR):** enums vía `text check`; SECURITY DEFINER → `private` con `set search_path=public` + `revoke ... from public,anon,authenticated`; RLS `(select auth.uid())`; índice que cubra cada FK; políticas del mismo rol/acción se fusionan.
- **Admin = rol admin:** resolver por `staff_members.role='admin'` / `ADMIN_SUPERUSER_ID` (patrón existente en `admin-chat.pg-store.ts` / `proxy.ts`). Endpoints admin re-chequean rol además de la RLS.
- **Diseño UI:** tokens `dash-*` (light/dark ya resueltos), a11y (badges con texto accesible, no solo color), i18n es/en en `src/lib/literals.json` + `literalsEn.json`, responsive.
- **Cloudflare bindings:** confirmar la sintaxis vigente del binding `ai` en `wrangler.jsonc` y la firma de runtime (`env.AI.run(...)`) contra la doc actual antes de implementar (usar la skill `cloudflare`/`workers-best-practices`). Los snippets reflejan lo conocido a la fecha; ajustar si difiere. **R2 se descartó** (requiere habilitación con términos/billing en el dashboard) — el knowledge va embebido (Task 1).
- Prerrequisito del usuario: proveer el contenido real de los 5 `.md` de knowledge (desde Omen `/srv/josecoded-data/knowledge`). El binding AI ya está disponible (`wrangler` logueado, token con `ai (write)`).

---

### Task 1: Knowledge embebido en el Worker (sin R2)

Embeber el contexto de conocimiento (`.md`) como un módulo TS en el gateway, para que Workers AI lo use en el edge sin depender del worker/Ollama **ni de R2** (R2 requiere habilitación con términos/billing en el dashboard — se evita). El contenido es estático y pequeño (~5 archivos, ~10-30KB); actualizarlo = redeploy (raro).

**Files:**
- ✅ YA CREADO por el controlador: `josecoded-api/src/knowledge/knowledge.json` — `{ "<file>.md": "<contenido>" }` con los 5 archivos reales (traídos de Omen). Es la fuente embebida (editar el JSON = actualizar el knowledge; requiere redeploy).
- Create: `josecoded-api/src/services/knowledge.ts` (importa el JSON y expone `getKnowledgeContext`).
- Create: `josecoded-api/src/services/knowledge.test.ts`

**Mecanismo (resuelto):** embeber vía **import de JSON** (`import data from '../knowledge/knowledge.json'`). JSON funciona igual en jest (ts-jest, `resolveJsonModule`) y en el build de wrangler/esbuild, y auto-escapa el contenido (incluido el backtick de `` `MEETING_PICKER` ``) — evita loaders de texto y problemas de escape. Confirmar que `resolveJsonModule` está activo en el `tsconfig` del gateway (Step 1).

**Interfaces:**
- Produces: `getKnowledgeContext(files?: string[], maxLen?: number): string` — **pura, síncrona, sin `env`** (el contenido está embebido). Concatena `--- <file> ---\n<contenido>` de los `files` pedidos, corta a `maxLen` (default 14_000, como `adminChat` hoy). Default files = `['terminal-chat.md','about.md','services.md','faq.md','tone.md']`.

- [ ] **Step 1: Confirmar `resolveJsonModule`** en `josecoded-api/tsconfig.json` (activarlo si falta). El contenido ya está en `knowledge.json` (controlador). No hace falta loader de texto.

- [ ] **Step 3: Escribir el test que falla** — `josecoded-api/src/services/knowledge.test.ts`:

```ts
import { getKnowledgeContext } from './knowledge';

describe('getKnowledgeContext (embebido)', () => {
  it('concatena los archivos pedidos con encabezado por archivo', () => {
    const ctx = getKnowledgeContext(['about.md']);
    expect(ctx).toContain('--- about.md ---');
    expect(ctx.length).toBeGreaterThan(0);
  });

  it('corta a maxLen', () => {
    const ctx = getKnowledgeContext(['about.md'], 20);
    expect(ctx.length).toBeLessThanOrEqual(20);
  });

  it('usa los 5 archivos por defecto', () => {
    const ctx = getKnowledgeContext();
    expect(ctx).toContain('--- about.md ---');
    expect(ctx).toContain('--- faq.md ---');
  });
});
```

- [ ] **Step 3b: Correr y verificar que falla** — `pnpm -C josecoded-api test -- knowledge` → FAIL (módulo inexistente).

- [ ] **Step 4: Implementar** `josecoded-api/src/services/knowledge.ts`:

```ts
import knowledgeData from '../knowledge/knowledge.json';

const KNOWLEDGE = knowledgeData as Record<string, string>;
const DEFAULT_FILES = ['terminal-chat.md', 'about.md', 'services.md', 'faq.md', 'tone.md'];
const DEFAULT_MAX = 14_000;

export function getKnowledgeContext(files: string[] = DEFAULT_FILES, maxLen: number = DEFAULT_MAX): string {
  return files
    .map((name) => {
      const text = (KNOWLEDGE[name] ?? '').trim();
      return text ? `--- ${name} ---\n${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n')
    .slice(0, maxLen);
}
```

- [ ] **Step 5: Test + typecheck** — `pnpm -C josecoded-api test -- knowledge && pnpm -C josecoded-api typecheck` → PASS.

- [ ] **Step 6: Commit** — `feat(api): embed admin-chat knowledge context in the Worker (no R2)`

---

### Task 2: Binding Workers AI + respuesta de IA en el edge

Reemplazar la generación de respuesta (hoy `callWorker('/ai/admin-chat')` → Ollama) por un binding Workers AI en el gateway, conservando el system prompt + el marcador `MEETING_PICKER`.

**Files:**
- Modify: `josecoded-api/wrangler.jsonc` (binding `ai`)
- Modify: `josecoded-api/src/types/env.types.ts` (tipar `AI` + `AI_CHAT_MODEL`)
- Modify: `josecoded-api/src/config/env.ts` (`AI_CHAT_MODEL` opcional)
- Create: `josecoded-api/src/services/ai-reply.ts`
- Create: `josecoded-api/src/services/ai-reply.test.ts`
- Modify: `josecoded-api/src/services/admin-chat-assistant.service.ts` (usar `ai-reply` en vez de `callWorker`)

**Interfaces:**
- Consumes: `env.AI` — `{ run(model: string, opts: { messages: {role:string;content:string}[] }): Promise<{ response?: string }> }`; `getKnowledgeContext` (Task 1).
- Produces:
  - `buildAdminChatMessages(knowledge: string, history: {role:'user'|'assistant';content:string}[], userText: string): {role:string;content:string}[]` — system prompt (el `adminChatSystemPrompt` actual, con la línea `MEETING_PICKER`) + knowledge + historial + turno del usuario.
  - `generateAdminReply(env: Env, input: { history; userText: string }): Promise<{ content: string; showMeetingPicker: boolean }>` — arma mensajes, llama `env.AI.run(model, { messages })`, devuelve `content` (sin la línea `MEETING_PICKER`) y `showMeetingPicker=true` si el modelo la emitió. `model = env.AI_CHAT_MODEL ?? '@cf/meta/llama-3.1-8b-instruct'`.

- [ ] **Step 1: Confirmar sintaxis del binding AI + elegir modelo** contra la doc/catálogo vigente (`wrangler.jsonc` `"ai": { "binding": "AI" }`; runtime `await env.AI.run(model, { messages })` → `{ response }`). Elegir modelo del catálogo (candidato `@cf/meta/llama-3.1-8b-instruct`; evaluar `@cf/meta/llama-3.3-70b-instruct-fp8-fast` por calidad). Fijar el default y documentarlo.

- [ ] **Step 2: Escribir el test que falla** — `ai-reply.test.ts` (mock `env.AI.run`):

```ts
import { buildAdminChatMessages, generateAdminReply } from './ai-reply';
import type { Env } from '../types/env.types';

describe('buildAdminChatMessages', () => {
  it('pone system con knowledge primero, luego historial y el turno del usuario', () => {
    const msgs = buildAdminChatMessages('CTX', [{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'hey' }], 'precio?');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('CTX');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'precio?' });
  });
});

describe('generateAdminReply', () => {
  const env = { AI: { run: async () => ({ response: 'Claro, te ayudo.' }) }, KNOWLEDGE_BUCKET: { get: async () => null } } as unknown as Env;
  it('devuelve el texto y showMeetingPicker=false sin marcador', async () => {
    const r = await generateAdminReply(env, { history: [], userText: 'hola' });
    expect(r.content).toBe('Claro, te ayudo.');
    expect(r.showMeetingPicker).toBe(false);
  });
  it('detecta MEETING_PICKER y lo quita del texto', async () => {
    const env2 = { ...env, AI: { run: async () => ({ response: 'Te propongo una llamada.\nMEETING_PICKER' }) } } as unknown as Env;
    const r = await generateAdminReply(env2, { history: [], userText: 'reunion?' });
    expect(r.showMeetingPicker).toBe(true);
    expect(r.content).not.toContain('MEETING_PICKER');
    expect(r.content.trim()).toBe('Te propongo una llamada.');
  });
});
```

- [ ] **Step 3: Correr y verificar que falla** — `pnpm -C josecoded-api test -- ai-reply` → FAIL.

- [ ] **Step 4: Implementar** `ai-reply.ts` (reusar el `adminChatSystemPrompt` — copiarlo desde `josecoded-worker/src/services/ai.service.ts:5-8`, incluye la instrucción de terminar con `MEETING_PICKER`):

```ts
import type { Env } from '../types/env.types';
import { getKnowledgeContext } from './knowledge';

const SYSTEM_PROMPT = `Eres el asistente del administrador en el chat del portfolio josecoded.
Respondes en nombre del administrador (Jose Dev): servicios, stack, plazos orientativos y encaje del proyecto.
Usa solo el contexto proporcionado. Se breve y profesional.
Si el visitante pide reunion, llamada o asesoria extensa en directo, termina la respuesta con una linea final exacta: MEETING_PICKER`;

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MEETING_MARKER = 'MEETING_PICKER';

export function buildAdminChatMessages(
  knowledge: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userText: string,
) {
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nContexto:\n\n${knowledge}` },
    ...history,
    { role: 'user', content: userText },
  ];
}

export async function generateAdminReply(
  env: Env,
  input: { history: { role: 'user' | 'assistant'; content: string }[]; userText: string },
): Promise<{ content: string; showMeetingPicker: boolean }> {
  const knowledge = getKnowledgeContext();
  const messages = buildAdminChatMessages(knowledge, input.history, input.userText);
  const model = env.AI_CHAT_MODEL ?? DEFAULT_MODEL;
  const out = await env.AI.run(model, { messages });
  const raw = (out.response ?? '').trim();
  const showMeetingPicker = raw.includes(MEETING_MARKER);
  const content = raw.replace(new RegExp(`\\n?\\s*${MEETING_MARKER}\\s*$`), '').trim();
  return { content, showMeetingPicker };
}
```

- [ ] **Step 5: Binding + tipos + env.** `wrangler.jsonc`: `"ai": { "binding": "AI" }`. `env.types.ts`: `AI: { run(model: string, opts: { messages: { role: string; content: string }[] }): Promise<{ response?: string }> };` y `AI_CHAT_MODEL?: string;`. `config/env.ts`: `AI_CHAT_MODEL: z.string().min(1).optional(),`.

- [ ] **Step 6: Cablear el pipeline.** En `admin-chat-assistant.service.ts`, reemplazar la llamada `callWorker(env, path, ...)` por `generateAdminReply(env, { history, userText })` (mapear el resultado a lo que el pipeline inserta como mensaje `assistant` + `messageType` según `showMeetingPicker`). Leer el archivo completo primero para preservar su firma pública (lo consume `admin-chat-n8n.service.ts` `runAssistantPipeline`). Mantener el manejo de errores.

- [ ] **Step 7: Test + typecheck + suite** — `pnpm -C josecoded-api test && pnpm -C josecoded-api typecheck` → verde.

- [ ] **Step 8: Commit** — `feat(api): admin-chat AI reply via Workers AI (drops Ollama for this flow)`

---

### Task 3: Migración Supabase — ai_enabled, no-leídos, last_message_at, RLS, Realtime (GATED, controller-driven)

> **No es un subagente.** El controlador la conduce vía Supabase MCP: pre-apply drift-check, `apply_migration`, `get_advisors` ×2. STOP para OK del usuario antes de aplicar.

**Cambios (SQL, idempotente):**
- `alter table admin_chat_conversations add column if not exists ai_enabled boolean not null default true;`
- `... add column if not exists admin_last_read_at timestamptz;`
- `... add column if not exists last_message_at timestamptz not null default now();`
- Trigger `AFTER INSERT` en `admin_chat_messages` → `update admin_chat_conversations set last_message_at = new.created_at where id = new.conversation_id;` (función en `private`, SECURITY DEFINER, `set search_path=public`).
- **RLS** (verificar estado actual primero): usuario ve solo `conversation.user_id = (select auth.uid())`; admin (`private.staff_role_of((select auth.uid())) = 'admin'`) ve/actualiza todas. Aplicar a `admin_chat_conversations` y `admin_chat_messages`. Fusionar políticas del mismo rol/acción.
- **Realtime:** `alter publication supabase_realtime add table admin_chat_messages;` (y `admin_chat_conversations` si la consola suscribe cambios de `ai_enabled`/`last_message_at`). La RLS del cliente autenticado gobierna qué recibe cada quién.
- Backfill: `update admin_chat_conversations set last_message_at = coalesce((select max(created_at) from admin_chat_messages m where m.conversation_id = admin_chat_conversations.id), created_at);` (idempotente).

- [ ] **Step 1:** `list_tables` + inspeccionar RLS/políticas actuales de ambas tablas + columnas (drift-check).
- [ ] **Step 2:** Redactar la migración final con lo de arriba (ajustada al estado real). STOP → OK del usuario.
- [ ] **Step 3:** `apply_migration`.
- [ ] **Step 4:** `get_advisors(security)` + `get_advisors(performance)` ×2 → limpio (índices que cubran FKs si faltan).
- [ ] **Step 5:** Registrar en el ledger las columnas/policies aplicadas.

---

### Task 4: Gate `ai_enabled` en el pipeline + notificar SIEMPRE

**Files:**
- Modify: `josecoded-api/src/services/admin-chat-n8n.service.ts` (`runAssistantPipeline`) o `admin-chat-assistant.service.ts` según dónde viva la orquestación (leer ambos primero)
- Modify: `josecoded-api/src/services/admin-chat.pg-store.ts` (helper `getConversationFlags(env, conversationId): Promise<{ aiEnabled: boolean }>`)
- Tests en el archivo de test correspondiente

**Interfaces:**
- Produces: `getConversationFlags(env, conversationId): Promise<{ aiEnabled: boolean }>` (lee `ai_enabled`).
- Comportamiento: en `runAssistantPipeline`, tras insertar el mensaje `user`: (1) **notificar SIEMPRE** al admin (Telegram/n8n existente) — con IA on o off; (2) si `getConversationFlags(...).aiEnabled` → generar y guardar respuesta IA (Task 2); si no → NO generar (Jose responderá desde la consola).

- [ ] **Step 1:** Leer `admin-chat-n8n.service.ts` + `admin-chat-assistant.service.ts` para ubicar el punto de orquestación y la notificación existente.
- [ ] **Step 2 (TDD):** Test — con `aiEnabled=false`, el pipeline NO llama a `generateAdminReply` pero SÍ notifica; con `true`, llama a ambos. (Inyectar/mocks de flags + AI + notify.)
- [ ] **Step 3:** Implementar el gate + asegurar la notificación incondicional.
- [ ] **Step 4:** Test + typecheck + suite verde.
- [ ] **Step 5: Commit** — `feat(api): respect ai_enabled toggle + always notify admin on user message`

---

### Task 5: Endpoints admin (consola backend)

**Files:**
- Create: `josecoded-api/src/modules/admin-chat-admin.routes.ts` (montado en `/api/v1/admin-chat/admin`, `requireUser` + role-check admin)
- Modify: `josecoded-api/src/modules/v1.routes.ts` (montar el sub-router)
- Modify: `josecoded-api/src/services/admin-chat.pg-store.ts` (queries admin)
- Create: `josecoded-api/src/schemas/admin-chat-admin.schema.ts`
- Tests: `admin-chat.pg-store.test.ts` (extender) + un test de rutas

**Interfaces (pg-store):**
- `listConversationsForAdmin(env): Promise<AdminConversationSummaryDTO[]>` — por conversación: `id`, `userId`, `userEmail`, `lastMessagePreview`, `lastMessageAt`, `aiEnabled`, `unread` (bool: existe msg `user` con `created_at > coalesce(admin_last_read_at,'epoch')`). Orden `last_message_at desc`.
- `getConversationMessagesForAdmin(env, conversationId): Promise<AdminChatMessageDTO[]>`.
- `insertAdminMessage(env, { conversationId, adminId, content }): Promise<AdminChatMessageDTO>` — `sender_role='admin'`; **no** dispara IA.
- `setConversationAiEnabled(env, conversationId, enabled): Promise<void>`.
- `markConversationRead(env, conversationId): Promise<void>` — `admin_last_read_at = now()`.
- Role-check: helper `assertAdmin(env, user)` reusando el patrón de `resolveSuperuser`/`staff_role_of`.

**Endpoints:** `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` (`{content}`), `POST /conversations/:id/ai` (`{enabled}`), `POST /conversations/:id/read`. Todos admin-only.

- [ ] **Step 1:** Leer `admin-chat.pg-store.ts` completo + `v1.routes.ts` + el patrón de role-check (`resolveSuperuser`) para mirror.
- [ ] **Step 2 (TDD):** Tests de las queries de store (mock del cliente Supabase como en `admin-chat.pg-store.test.ts`) — al menos `listConversationsForAdmin` (cálculo de `unread`) y `insertAdminMessage` (`sender_role='admin'`).
- [ ] **Step 3:** Implementar store + schemas + rutas + role-check + montaje.
- [ ] **Step 4:** Test + typecheck + suite verde.
- [ ] **Step 5: Commit** — `feat(api): admin console endpoints (list/messages/reply/ai-toggle/read)`

---

### Task 6: Consola admin UI (`/admin/chats`) + Realtime

**Files:**
- Create: `src/app/[locale]/admin/chats/page.tsx`
- Create: `src/components/staff-dash/admin-chats-client.tsx`
- Create: `src/components/staff-dash/use-admin-chats.ts` (fetch + Realtime)
- Create: `src/services/admin-chats-api.ts` (llamadas a los endpoints de Task 5)
- Modify: `src/components/staff-dash/dash-shell.tsx` (nav link "Chats" con badge de no-leídos)
- Modify: `src/lib/literals.json` + `literalsEn.json` (bloque `adminChats`)

**Interfaces (consume Task 5):** `listConversations()`, `getMessages(id)`, `sendAdminMessage(id, content)`, `setAi(id, enabled)`, `markRead(id)` → `FetchResult<...>` (mirror de `leads-api`/`admin-chat-api`).

- [ ] **Step 1:** Leer una página admin hermana (`admin/clientes` + `admin-clientes-client` + `use-admin-clients`) y `admin-chat-api.ts` para mirror de estilos, hook fetch+reload, y cliente browser Supabase (`getSupabaseSSRBrowserClient`) para Realtime.
- [ ] **Step 2:** `admin-chats-api.ts` (llamadas REST a `/api/v1/admin-chat/admin/*` con `NEXT_PUBLIC_JOSECODED_API_URL` + `Authorization: Bearer` del token de sesión — mirror de `admin-chat-api.ts`).
- [ ] **Step 3:** `use-admin-chats.ts` — carga la lista + se suscribe con el cliente browser Supabase a `admin_chat_messages` (`channel('admin-chats').on('postgres_changes', { event:'INSERT', schema:'public', table:'admin_chat_messages' }, ...)`) → refetch de la lista/hilo al llegar inserts. Cleanup del canal en unmount. Fallback: si el canal no conecta, `setInterval` refetch ~8s.
- [ ] **Step 4:** `admin-chats-client.tsx` — lista con nombre/email + preview + **badge rojo** (`unread`) + estado IA; al abrir un hilo: mensajes (user/assistant/admin diferenciados), caja de respuesta (envía como admin), **switch IA** (`setAi`), y `markRead` al abrir. `dash-*`, a11y (badge con `aria-label`/texto, no solo color), responsive.
- [ ] **Step 5:** Nav link "Chats" en `dash-shell` (con badge agregado de no-leídos si hay), + literales `adminChats.*` es/en.
- [ ] **Step 6:** `pnpm typecheck && pnpm build && pnpm test` verde (ruta compila es/en).
- [ ] **Step 7: Commit** — `feat(web): admin chat console (/admin/chats) with unread badges + realtime + AI toggle`

---

### Task 7: Verificación en vivo (el gate real)

Con el gateway desplegable (o `wrangler dev`) + Supabase live + cuentas throwaway:

- [ ] 1. Usuario registrado manda mensaje con **IA on** → aparece respuesta `assistant` (Workers AI) en su hilo; el admin recibe notificación Telegram; la conversación sube en la consola con badge.
- [ ] 2. Admin **apaga la IA** en esa conversación → el usuario manda otro mensaje → NO hay respuesta IA; el admin recibe notificación; responde desde la consola (`sender_role='admin'`) y el usuario lo ve en su hilo.
- [ ] 3. **Badges/no-leídos:** un mensaje nuevo de usuario marca la conversación como no-leída (badge rojo); abrir la conversación (`markRead`) lo limpia; con Realtime el badge aparece sin recargar.
- [ ] 4. **Aislamiento RLS/Realtime:** un segundo usuario NO ve ni recibe por el canal los mensajes del primero; un no-admin no puede llamar los endpoints admin (403/RLS 0 filas).
- [ ] 5. `MEETING_PICKER`: pedir reunión → el asistente emite el meeting picker (message_type) como antes.
- [ ] 6. `get_advisors(security/performance)` ×2 → limpio.

Registrar resultados en el ledger. NO declarar P1 hecho solo con build/tests.

---

## Self-Review

**Spec coverage:** IA→Workers AI (Task 2) + knowledge→R2 (Task 1) ✓; `ai_enabled`/no-leídos/`last_message_at`/RLS/Realtime (Task 3) ✓; gate `ai_enabled` + notificar siempre (Task 4) ✓; endpoints admin (Task 5) ✓; consola UI + Realtime + badges (Task 6) ✓; verificación en vivo incl. aislamiento (Task 7) ✓. El contrato del front de `/messages` se preserva (Global Constraints + Task 2 Step 6).

**Placeholder scan:** los `.md` a subir, el modelo exacto de Workers AI, y la sintaxis de bindings están marcados con pasos de verificación (Task 1/2 Step 1), no como huecos. La migración (Task 3) enumera el SQL concreto; el drift-check ajusta al estado real.

**Type consistency:** `getKnowledgeContext(env,...)` (Task 1) se consume en `generateAdminReply` (Task 2). `generateAdminReply`/`buildAdminChatMessages` (Task 2) se consumen en el pipeline (Task 4/2 Step 6). `getConversationFlags` (Task 4), las funciones de store admin (Task 5) y `admin-chats-api` (Task 6) tienen firmas definidas antes de consumirse.

**Riesgos abiertos:** sintaxis de bindings AI/R2 y modelo (Task 1/2 Step 1 obligan a verificar contra doc vigente); RLS+Realtime isolation es el gate de Task 7.
