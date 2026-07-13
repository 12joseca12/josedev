# P0 — Cloudflare Account + Reliability Base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabilizar la infra actual del gateway/worker antes de cualquier cutover: túnel de producción en vez de ngrok, rate-limiting nativo de Cloudflare en vez del `Map` en memoria, y fix del timeout que corta el chat a los 10s.

**Architecture:** El gateway `josecoded-api` es un Cloudflare Worker (Hono). Este plan toca solo el gateway (código + `wrangler.jsonc`) y la infra del home server "Omen" (cloudflared). No mueve el front ni migra la IA todavía (eso es P1/P2). Cada tarea es un entregable verificable por separado.

**Tech Stack:** Cloudflare Workers, Hono, Zod, Jest (ts-jest), wrangler; cloudflared (systemd) en Omen (Ubuntu).

## Global Constraints

- Gateway path base: `josecoded-api/` (dentro del repo `josedev`). Test runner: **Jest**, correr con `pnpm -C josecoded-api test`. Typecheck: `pnpm -C josecoded-api typecheck`.
- Dominio de producción: **josecoded.com** (según `CORS_ORIGINS` en `wrangler.jsonc`). ⚠️ Confirmar con el usuario si el sitio final es `josecoded.com` o `josedev.com` antes de rutar hostnames del túnel.
- No introducir secretos en `wrangler.jsonc` `vars` (van por `wrangler secret`). `WORKER_INTERNAL_TOKEN` ya es secreto.
- El worker Fastify (`josecoded-worker`) NO se toca en código en esta fase salvo config de despliegue; su token interno usa `timingSafeEqual` y se mantiene.
- Prerrequisitos que provee el usuario antes de ejecutar: Cloudflare `account_id`, acceso a la zona DNS de `josecoded.com` en Cloudflare, y acceso SSH a Omen (`192.168.1.176`).

---

### Task 1: Fix del timeout de `/ai/chat`

Hoy `/ai/chat` llama a `callWorker` sin `timeoutMs`, usando el default de 10s, mientras el worker espera 60s → 504 en respuestas válidas. Extraemos un resolver testeable y lo cableamos.

**Files:**
- Modify: `josecoded-api/src/config/env.ts` (añadir `AI_CHAT_TIMEOUT_MS` al schema Zod)
- Modify: `josecoded-api/src/types/env.types.ts` (añadir el campo al tipo `Env`)
- Create: `josecoded-api/src/services/ai-timeout.ts` (resolver puro)
- Create: `josecoded-api/src/services/ai-timeout.test.ts`
- Modify: `josecoded-api/src/modules/ai.routes.ts` (pasar `timeoutMs`)

**Interfaces:**
- Produces: `resolveAiChatTimeoutMs(env: Env): number` — devuelve `AI_CHAT_TIMEOUT_MS` parseado si es válido y >0, si no `30_000` (30s; margen bajo el límite de subrequest de Workers, suficiente para superar el corte de 10s; interino hasta P1/Workers AI).

- [ ] **Step 1: Escribir el test que falla**

Crear `josecoded-api/src/services/ai-timeout.test.ts`:

```ts
import { resolveAiChatTimeoutMs } from './ai-timeout';
import type { Env } from '../types/env.types';

const base = {} as Env;

describe('resolveAiChatTimeoutMs', () => {
  it('usa el default 30000 si no hay config', () => {
    expect(resolveAiChatTimeoutMs(base)).toBe(30_000);
  });
  it('usa el valor configurado válido', () => {
    expect(resolveAiChatTimeoutMs({ ...base, AI_CHAT_TIMEOUT_MS: '45000' } as Env)).toBe(45_000);
  });
  it('cae al default si el valor no es numérico o es <= 0', () => {
    expect(resolveAiChatTimeoutMs({ ...base, AI_CHAT_TIMEOUT_MS: 'abc' } as Env)).toBe(30_000);
    expect(resolveAiChatTimeoutMs({ ...base, AI_CHAT_TIMEOUT_MS: '0' } as Env)).toBe(30_000);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm -C josecoded-api test -- ai-timeout`
Expected: FAIL — `Cannot find module './ai-timeout'`.

- [ ] **Step 3: Implementación mínima**

Crear `josecoded-api/src/services/ai-timeout.ts`:

```ts
import type { Env } from '../types/env.types';

/** Timeout para el proxy de /ai/chat al worker. Default 30s (bajo el límite de
 *  subrequest de Workers) — suficiente para superar el corte de 10s heredado. */
export function resolveAiChatTimeoutMs(env: Env): number {
  const fallback = 30_000;
  const raw = env.AI_CHAT_TIMEOUT_MS;
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
```

- [ ] **Step 4: Añadir el campo al schema y al tipo**

En `josecoded-api/src/config/env.ts`, dentro de `envSchema` (junto a `WORKER_TIMEOUT_MS`):

```ts
  AI_CHAT_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
```

En `josecoded-api/src/types/env.types.ts`, añadir al tipo `Env` el campo opcional `AI_CHAT_TIMEOUT_MS?: string;` (seguir el estilo de los campos existentes del archivo).

- [ ] **Step 5: Cablear en la ruta**

En `josecoded-api/src/modules/ai.routes.ts`, importar el resolver y pasarlo:

```ts
import { resolveAiChatTimeoutMs } from '../services/ai-timeout';
// ...
    const data = await callWorker<unknown>(c.env, '/ai/chat', {
      method: 'POST',
      body: parsed.data,
      timeoutMs: resolveAiChatTimeoutMs(c.env),
    });
```

- [ ] **Step 6: Correr tests + typecheck**

Run: `pnpm -C josecoded-api test -- ai-timeout && pnpm -C josecoded-api typecheck`
Expected: PASS y typecheck sin errores.

- [ ] **Step 7: Commit**

```bash
git add josecoded-api/src/services/ai-timeout.ts josecoded-api/src/services/ai-timeout.test.ts josecoded-api/src/config/env.ts josecoded-api/src/types/env.types.ts josecoded-api/src/modules/ai.routes.ts
git commit -m "fix(api): give /ai/chat its own configurable timeout (default 30s, was 10s)"
```

---

### Task 2: Rate limiting nativo de Cloudflare para `/ai/*`

El rate-limit actual es un `Map` en memoria por isolate → no es global ni persistente. Lo reemplazamos por el **binding de Rate Limiting de Cloudflare** (account-scoped, funciona entre isolates), envuelto en un middleware con la misma firma para que el resto del código no cambie.

**Files:**
- Modify: `josecoded-api/wrangler.jsonc` (añadir binding `ratelimits`)
- Modify: `josecoded-api/src/types/env.types.ts` (tipar el binding)
- Create: `josecoded-api/src/middlewares/native-rate-limit.middleware.ts`
- Create: `josecoded-api/src/middlewares/native-rate-limit.middleware.test.ts`
- Modify: `josecoded-api/src/index.ts` (usar el nuevo middleware en `/ai/*`)

**Interfaces:**
- Consumes: `env.AI_RATE_LIMITER` — binding de tipo `{ limit(opts: { key: string }): Promise<{ success: boolean }> }`.
- Produces: `nativeRateLimit(getLimiter: (env: Env) => RateLimiterBinding | undefined, opts: { keyPrefix: string }): MiddlewareHandler` — si el binding no existe (dev local), deja pasar (fail-open en dev); si existe y `success === false`, responde 429 con `Retry-After` y el body `fail('rate_limited', 'Too many requests')` (misma forma que hoy).

- [ ] **Step 1: Verificar la sintaxis del binding contra la doc vigente**

Confirmar en la documentación actual de Cloudflare Workers Rate Limiting la clave exacta de `wrangler.jsonc` y la firma de `.limit()`. A la fecha de este plan: config `"ratelimits": [{ "name": "AI_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 20, "period": 60 } }]` y en runtime `await env.AI_RATE_LIMITER.limit({ key })` → `{ success: boolean }`. `period` solo admite `10` o `60`. Ajustar los pasos siguientes si la doc difiere.

- [ ] **Step 2: Escribir el test que falla**

Crear `josecoded-api/src/middlewares/native-rate-limit.middleware.test.ts`:

```ts
import { Hono } from 'hono';
import { nativeRateLimit } from './native-rate-limit.middleware';

function appWith(limiter: any) {
  const app = new Hono<any>();
  app.use('/ai/*', nativeRateLimit(() => limiter, { keyPrefix: 'ai' }));
  app.get('/ai/ping', (c) => c.text('ok'));
  return app;
}

describe('nativeRateLimit', () => {
  it('deja pasar cuando el binding permite', async () => {
    const res = await appWith({ limit: async () => ({ success: true }) })
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(200);
  });

  it('responde 429 cuando el binding niega', async () => {
    const res = await appWith({ limit: async () => ({ success: false }) })
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBeTruthy();
  });

  it('fail-open si no hay binding (dev local)', async () => {
    const res = await appWith(undefined)
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `pnpm -C josecoded-api test -- native-rate-limit`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 4: Implementación mínima**

Crear `josecoded-api/src/middlewares/native-rate-limit.middleware.ts`:

```ts
import type { Context, MiddlewareHandler } from 'hono';
import { fail } from '../utils/api-response';
import type { Env } from '../types/env.types';

export type RateLimiterBinding = { limit(opts: { key: string }): Promise<{ success: boolean }> };

function getClientId(c: Context): string {
  const ip = c.req.header('cf-connecting-ip')?.trim() || c.req.header('x-real-ip')?.trim();
  return ip || 'unknown';
}

/** Rate-limit con el binding nativo de Cloudflare (global, entre isolates).
 *  Sin binding (dev local) hace fail-open para no romper `wrangler dev`. */
export function nativeRateLimit(
  getLimiter: (env: Env) => RateLimiterBinding | undefined,
  opts: { keyPrefix: string },
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const limiter = getLimiter(c.env);
    if (!limiter) return next();
    const key = `${opts.keyPrefix}:${getClientId(c)}`;
    const { success } = await limiter.limit({ key });
    if (!success) {
      c.header('Retry-After', '60');
      return c.json(fail('rate_limited', 'Too many requests'), 429);
    }
    return next();
  };
}
```

- [ ] **Step 5: Tipar el binding y configurar wrangler**

En `josecoded-api/src/types/env.types.ts`, añadir a `Env`:

```ts
  AI_RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
```

En `josecoded-api/wrangler.jsonc`, añadir al objeto raíz:

```jsonc
  "ratelimits": [
    { "name": "AI_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 20, "period": 60 } }
  ],
```

- [ ] **Step 6: Usar el middleware en `/ai/*`**

En `josecoded-api/src/index.ts`, reemplazar el bloque `app.use('/ai/*', fixedWindowRateLimit(...))` por:

```ts
import { nativeRateLimit } from './middlewares/native-rate-limit.middleware';
// ...
app.use('/ai/*', nativeRateLimit((env) => env.AI_RATE_LIMITER, { keyPrefix: 'ai' }));
```

Dejar `fixedWindowRateLimit`/`forumWriteRateLimit` en `security.middleware.ts` por ahora (el foro se migra igual en un paso posterior; no romper imports existentes).

- [ ] **Step 7: Correr tests + typecheck**

Run: `pnpm -C josecoded-api test && pnpm -C josecoded-api typecheck`
Expected: toda la suite PASS, typecheck limpio.

- [ ] **Step 8: Commit**

```bash
git add josecoded-api/src/middlewares/native-rate-limit.middleware.ts josecoded-api/src/middlewares/native-rate-limit.middleware.test.ts josecoded-api/src/types/env.types.ts josecoded-api/wrangler.jsonc josecoded-api/src/index.ts
git commit -m "feat(api): native Cloudflare rate limiting for /ai/* (replaces in-memory map)"
```

---

### Task 3: Cloudflare Tunnel en Omen (reemplazo de ngrok)

Reemplazar el túnel ngrok (SPOF, URL inestable) por un **named tunnel de Cloudflare** con hostname estable. Infra en el home server + limpieza del manejo del interstitial de ngrok en el gateway.

**Files:**
- Create: `josecoded-worker/infra/cloudflared/README.md` (pasos + config de referencia)
- Modify: `josecoded-api/src/services/worker.service.ts` (quitar el header `ngrok-skip-browser-warning`)
- Modify: `josecoded-api/wrangler.jsonc` (`WORKER_URL` → hostname del túnel)

- [ ] **Step 1: Crear el named tunnel en Cloudflare (en Omen, vía SSH)**

Documentar y ejecutar (requiere la cuenta del usuario):

```bash
# En Omen
curl -L https://pkg.cloudflare.com/... -o cloudflared.deb && sudo dpkg -i cloudflared.deb   # o el método vigente
cloudflared tunnel login                     # abre el navegador, autoriza la zona josecoded.com
cloudflared tunnel create josecoded-worker   # crea el túnel + credenciales ~/.cloudflared/<UUID>.json
```

- [ ] **Step 2: Config del túnel + ruta de hostname**

Crear `josecoded-worker/infra/cloudflared/README.md` con el `config.yml` de referencia y los comandos:

```yaml
# ~/.cloudflared/config.yml
tunnel: <UUID>
credentials-file: /home/jose/.cloudflared/<UUID>.json
ingress:
  - hostname: worker.josecoded.com
    service: http://localhost:4000
  - service: http_status:404
```

```bash
cloudflared tunnel route dns josecoded-worker worker.josecoded.com
```

(El README documenta que el hostname es interno: solo el gateway lo consume, con `Bearer WORKER_INTERNAL_TOKEN`; no es un endpoint público de datos.)

- [ ] **Step 3: systemd para cloudflared**

En el mismo README, documentar la instalación como servicio:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
systemctl status cloudflared    # verificar activo
```

- [ ] **Step 4: Quitar el manejo de ngrok en el gateway**

En `josecoded-api/src/services/worker.service.ts`, eliminar el bloque que añade el header de ngrok en `buildWorkerRequestHeaders`:

```ts
  // ELIMINAR:
  if (env.WORKER_URL.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
```

- [ ] **Step 5: Apuntar `WORKER_URL` al túnel**

En `josecoded-api/wrangler.jsonc`, cambiar:

```jsonc
"WORKER_URL": "https://worker.josecoded.com",
```

- [ ] **Step 6: Verificación end-to-end**

```bash
# Salud del worker vía el túnel (público, sin token):
curl -s https://worker.josecoded.com/health
# Esperado: JSON de health del Fastify, sin interstitial HTML.
```

Correr `pnpm -C josecoded-api test && pnpm -C josecoded-api typecheck` (nada debe romperse).

- [ ] **Step 7: Commit**

```bash
git add josecoded-worker/infra/cloudflared/README.md josecoded-api/src/services/worker.service.ts josecoded-api/wrangler.jsonc
git commit -m "feat(infra): Cloudflare Tunnel for Omen worker; drop ngrok interstitial handling"
```

---

### Task 4: Wiring de la cuenta Cloudflare + deploy del gateway

Dejar el gateway desplegable en la cuenta del usuario, con secretos fuera del repo y un `deploy --dry-run` verde.

**Files:**
- Modify: `josecoded-api/wrangler.jsonc` (`account_id`, `vars` de producción)
- Create: `josecoded-api/DEPLOY.md` (runbook de secretos + deploy)

- [ ] **Step 1: Autenticar wrangler con la cuenta del usuario**

```bash
cd josecoded-api
pnpm exec wrangler login        # el usuario autoriza en el navegador
pnpm exec wrangler whoami       # confirmar cuenta + account_id
```

- [ ] **Step 2: Fijar `account_id` y vars de producción**

En `josecoded-api/wrangler.jsonc`, añadir `"account_id": "<del whoami>"` y revisar que `vars` no contenga secretos (solo `API_MODE`, `WORKER_URL`, `CORS_ORIGINS`, ids de admin). Marcar `API_MODE` de producción vía entorno/deploy (no forzar a `production` en el `vars` de dev si se comparte el archivo — documentar en DEPLOY.md).

- [ ] **Step 3: Runbook de secretos**

Crear `josecoded-api/DEPLOY.md` documentando los `wrangler secret put` necesarios (valores los pone el usuario, no van al repo):

```bash
pnpm exec wrangler secret put WORKER_INTERNAL_TOKEN
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # si aplica
# (SUPABASE_URL / ANON pueden ir como vars públicos según env.ts)
```

Incluir nota: **rotar** `WORKER_INTERNAL_TOKEN` en este paso (coordinar con el `.env` del worker Fastify en Omen) y las credenciales pegadas en chat (se cierra formalmente en P3).

- [ ] **Step 4: Dry-run del deploy**

```bash
pnpm exec wrangler deploy --dry-run --outdir=dist
```
Expected: build OK, bindings listados (incluido `AI_RATE_LIMITER`), sin errores de env.

- [ ] **Step 5: Commit**

```bash
git add josecoded-api/wrangler.jsonc josecoded-api/DEPLOY.md
git commit -m "chore(api): Cloudflare account wiring + deploy runbook (secrets via wrangler secret)"
```

---

## Self-Review

**Spec coverage (P0 del spec):** Tunnel (Task 3) ✓; rate-limit nativo (Task 2) ✓; fix timeout (Task 1) ✓; wiring de cuenta/deploy (Task 4) ✓. La verificación local del JWT del spec es "(opcional)" — se difiere a P3 (seguridad) para no ampliar P0; anotado.

**Placeholder scan:** sin TBD/TODO en pasos; los valores a proveer por el usuario (`account_id`, UUID del túnel, valores de secretos) están marcados como inputs de ejecución, no como código faltante. `namespace_id: "1001"` y `period` verificados contra doc en Task 2 Step 1.

**Type consistency:** `resolveAiChatTimeoutMs(env)` (Task 1) y `nativeRateLimit(getLimiter, opts)` + `RateLimiterBinding` (Task 2) se usan con la misma firma donde se referencian. `Env.AI_CHAT_TIMEOUT_MS` y `Env.AI_RATE_LIMITER` añadidos al tipo antes de usarse.

**Riesgo abierto:** la sintaxis exacta del binding de Rate Limiting puede haber cambiado — Task 2 Step 1 obliga a verificar contra la doc vigente antes de implementar.
