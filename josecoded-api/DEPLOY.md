# Deploy runbook — josecoded-api (Cloudflare Worker)

Este documento describe cómo desplegar el gateway `josecoded-api` a la cuenta
Cloudflare del proyecto (`d26022a34346cb759178a720bace386d`,
`developerjose12@gmail.com`) y qué secretos hay que fijar antes del primer
deploy real. Ningún valor secreto vive en el repo: los secretos se cargan con
`wrangler secret put` directamente contra la cuenta Cloudflare.

## 0. Prerrequisitos

```bash
cd josecoded-api
pnpm exec wrangler login    # una sola vez por máquina; abre el navegador
pnpm exec wrangler whoami   # confirma cuenta + account_id == d26022a34346cb759178a720bace386d
```

`wrangler.jsonc` ya fija `account_id` en la raíz, así que `wrangler deploy` no
pedirá seleccionar cuenta interactivamente.

## 1. Variables no secretas (`vars` en `wrangler.jsonc`)

Estas viven en el repo porque no son sensibles (URLs públicas, CORS, IDs de
admin que ya son públicos en Supabase Auth):

| Var | Valor actual | Notas |
|---|---|---|
| `API_MODE` | `development` | Ver sección 4 — el override de producción se documenta ahí, no se cambia en este task. |
| `WORKER_URL` | `https://worker.josecoded.com` | URL pública del Cloudflare Tunnel hacia el Fastify worker en Omen (Task 3). |
| `CORS_ORIGINS` | `http://localhost:3000,https://josecoded.com` | Lista separada por comas. |
| `ADMIN_SUPERUSER_ID` | UUID de Supabase Auth | No es secreto (es un identificador, no una credencial). |
| `ADMIN_SUPERUSER_EMAIL` | email del admin | Idem. |

El binding nativo de rate limiting también vive en `wrangler.jsonc` (no es un
secreto, es infraestructura):

```jsonc
"ratelimits": [
  { "name": "AI_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 20, "period": 60 } }
]
```

## 2. Secretos requeridos (`wrangler secret put`)

Fuente de verdad: `josecoded-api/src/config/env.ts` (`envSchema`) y
`src/types/env.types.ts`. Los valores **no** se pegan en este archivo, ni en
el repo, ni en chats: los pone el usuario directamente en el prompt de
`wrangler secret put`.

### Obligatorios para que el gateway arranque en producción

| Secreto | Por qué es secreto | Validación en `env.ts` |
|---|---|---|
| `WORKER_INTERNAL_TOKEN` | Token compartido con el Fastify worker (Omen); si se filtra, cualquiera puede llamar al worker interno. | `z.string().min(10)`, obligatorio |
| `SUPABASE_URL` | Técnicamente es una URL pública de proyecto, pero se fija como secreto/var de entorno por env — **no** contiene credenciales, se puede tratar como var no sensible si se prefiere (ver nota abajo). | `z.string().url()`, obligatorio |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave con privilegios totales sobre la base de datos (bypassa RLS). Nunca debe ir en `vars`. | `z.string().min(20).optional()` — opcional en el schema, pero **requerida** en producción para foro en BD / chat terminal (sin ella cae a mock). |

```bash
pnpm exec wrangler secret put WORKER_INTERNAL_TOKEN
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put SUPABASE_URL
```

### Al menos una de estas dos (validado por `.refine()` en `env.ts`)

| Secreto | Notas |
|---|---|
| `SUPABASE_ANON_KEY` | Legacy JWT anon. |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publicable moderna (`sb_publishable_...`). Recomendada. |

Aunque estas claves están diseñadas para ser expuestas en clientes (no dan
acceso privilegiado), se recomienda fijarlas como `secret` en Cloudflare por
consistencia operativa (un solo mecanismo de rotación) salvo que se prefiera
moverlas a `vars` — si se hace, actualizar este documento.

```bash
pnpm exec wrangler secret put SUPABASE_PUBLISHABLE_KEY
# o, si el proyecto usa el flujo legacy:
# pnpm exec wrangler secret put SUPABASE_ANON_KEY
```

### Opcionales (según features habilitadas)

| Secreto/var | Requerido si... |
|---|---|
| `DEV_API_KEY` | Se quiere proteger `/api/dev/*` con clave separada. |
| `WORKER_TIMEOUT_MS` | Se quiere override del timeout por defecto hacia el worker. |
| `AI_CHAT_TIMEOUT_MS` | Override del timeout de `/ai/chat` (default 30000ms, Task 1). |
| `FORUM_ADMIN_USER_IDS` | Moderación de foro en modo mock. |
| `FORUM_USE_MOCK` / `FORUM_USE_DATABASE` | Forzar modo mock/BD del foro. |
| `FORUM_MODERATION_DISABLED` | Deshabilitar moderación del foro. |
| `ADMIN_CHAT_WORKER_PATH` | Override de la ruta del chat admin (default `/ai/admin-chat`). |
| `ADMIN_CHAT_WORKER_TIMEOUT_MS` | Timeout del chat admin (default 60000ms). |
| `EMULATOR_SESSION_TIMEOUT_MS` | Boot del emulador Android (recomendado ≥ 360000 si se usa). |
| `N8N_CHAT_WEBHOOK_URL` / `N8N_CHAT_WEBHOOK_SECRET` | Solo si el chat usa n8n en vez del fallback automático. |
| `PUBLIC_API_BASE_URL` | URL pública del propio gateway, usada en callbacks de n8n. |

Estos no son sensibles en su mayoría (son configuración, no credenciales) y
pueden ir como `vars` en `wrangler.jsonc` si se decide fijarlos de forma
permanente; los que sí son secretos (`N8N_CHAT_WEBHOOK_SECRET`, `DEV_API_KEY`)
deben ir como `wrangler secret put`.

## 3. Rotación de `WORKER_INTERNAL_TOKEN` (acción pendiente, post-migración ngrok → Tunnel)

Con la migración del túnel (Task 3, `WORKER_URL` ahora apunta a
`https://worker.josecoded.com` en vez de una URL ngrok efímera), corresponde
**rotar** `WORKER_INTERNAL_TOKEN` como buena práctica — el valor anterior
pudo haber quedado expuesto en configuraciones de ngrok o pegado en chats
durante el desarrollo.

Pasos (coordinar ambos lados en la misma ventana, si no quedan desincronizados
y el gateway recibirá 401 del worker):

1. Generar un token nuevo (ej. `openssl rand -hex 32`).
2. En el Fastify worker (Omen), actualizar `BACKEND_INTERNAL_TOKEN` en su
   `.env` con el nuevo valor y reiniciar el proceso.
3. En Cloudflare, fijar el mismo valor:
   ```bash
   pnpm exec wrangler secret put WORKER_INTERNAL_TOKEN
   ```
4. Verificar con una llamada real al gateway que dependa del worker (p. ej.
   `/ai/chat` o el healthcheck) que no devuelve 401.

**Invariante:** `WORKER_INTERNAL_TOKEN` (gateway, Cloudflare secret) y
`BACKEND_INTERNAL_TOKEN` (worker Fastify, Omen `.env`) deben ser
**exactamente el mismo string** en todo momento. Este cierre formal de
credenciales pegadas en chat durante el desarrollo se completa en P3
(seguridad); aquí solo se deja documentado y se rota el token como primer
paso.

## 4. `API_MODE=production` — pendiente de estructurar (follow-up P8)

`wrangler.jsonc` comparte un único bloque `vars` (no hay `[env.production]`
todavía), y ese bloque fija `API_MODE=development`. Este task **no**
reestructura los entornos — solo se documenta el plan para cuando se haga el
cutover real (P8):

- Opción A: añadir un bloque `env.production` en `wrangler.jsonc` con su
  propio `vars.API_MODE = "production"` (y el resto de vars que difieran), y
  desplegar con `wrangler deploy --env production`.
- Opción B: mantener un solo entorno pero hacer override en el momento del
  deploy, p. ej. `wrangler deploy --var API_MODE:production` (evaluar si
  wrangler v4 soporta `--var` para `vars` no-secretos en el momento del
  deploy, o si conviene moverlo a secret).

Hasta que P8 decida el cutover, el deploy vigente (incluyendo el dry-run de
este task) se hace con `API_MODE=development`, que es el valor real
actualmente en `vars`.

## 5. Deploy

```bash
cd josecoded-api
pnpm exec wrangler deploy
```

Esto compila y sube el Worker a la cuenta fijada por `account_id`, usando los
`vars` de `wrangler.jsonc` y los `secret` ya cargados vía
`wrangler secret put`.

### Verificación en seco (dry-run, no sube nada)

```bash
pnpm exec wrangler deploy --dry-run --outdir=dist
```

Confirma que:
- el build compila sin errores,
- los bindings (`AI_RATE_LIMITER`, `vars`) se listan correctamente,
- no hay errores de validación de entorno (`parseEnv` en `src/config/env.ts`
  solo se ejecuta en runtime, así que el dry-run valida el build/bindings,
  no el contenido de los secretos — para eso hace falta un deploy real o
  `wrangler dev` con `.dev.vars`).

## 6. Checklist antes de un deploy real a producción

- [ ] `wrangler whoami` confirma la cuenta correcta.
- [ ] `WORKER_INTERNAL_TOKEN` rotado y sincronizado con `BACKEND_INTERNAL_TOKEN` en Omen (sección 3).
- [ ] Todos los secretos obligatorios (sección 2) están fijados en la cuenta (`wrangler secret list`).
- [ ] Decisión sobre `API_MODE=production` tomada y aplicada (sección 4, P8).
- [ ] `pnpm test` y `pnpm typecheck` en verde.
- [ ] `wrangler deploy --dry-run --outdir=dist` sin errores.
