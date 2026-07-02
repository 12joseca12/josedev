# josecoded-api

Cloudflare Worker (Hono) that acts as the **public API gateway** between the
`josedev` browser client and the private backend. Deployed independently of
`josedev` (own `wrangler deploy`), but developed as a workspace subfolder of
this repo — see `../docs/ARCHITECTURE.md` for why it lives here instead of a
separate repo.

## Role in the system

```
browser
  → josedev (Next.js, calls NEXT_PUBLIC_JOSECODED_API_URL)
    → josecoded-api (this project, Cloudflare edge, public but token/CORS gated)
        - forum + admin-chat: talk to Supabase directly (SUPABASE_* vars)
        - /ai/*, /demo/android/*, /system/status: proxy to WORKER_URL
      → backend (/Volumes/JosecodedData/backend, Fastify, private)
          requires `Authorization: Bearer BACKEND_INTERNAL_TOKEN` (WORKER_INTERNAL_TOKEN here)
```

This worker is the trust boundary: the backend's own `AGENTS.md` explicitly
requires browser traffic to go through this gateway rather than calling the
internal worker directly, and forbids exposing `BACKEND_INTERNAL_TOKEN` to
frontend code. Do not collapse this proxy into `josedev` server actions
without preserving that boundary.

## Structure

- `src/index.ts` — Hono app entry, route mounting.
- `src/modules/*.routes.ts` — HTTP route definitions (forum, admin-chat, ai,
  emulator, health, system, v1 aggregator, dev-worker-proxy).
- `src/services/*` — domain logic: Supabase-backed forum/admin-chat stores
  (`*.pg-store.ts`), in-memory mock stores (`*.mock-store.ts`) for
  `pnpm dev:api:mock`, `worker.service.ts` (proxy to the backend), n8n bridge.
- `src/schemas/*` — Zod request validation per domain.
- `src/middlewares/*` — auth (Supabase JWT) and security (CORS/headers).
- `src/config/env.ts` — runtime env validation.
- `src/types/*` — domain types (forum, admin-chat, env).

## Env vars

See `.dev.vars.example`. Key ones:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — forum + admin-chat persistence.
- `PUBLIC_API_BASE_URL` — where this worker itself runs locally (`wrangler dev`, default `:8787`).
- `WORKER_URL` — URL of the **backend** (`/Volumes/JosecodedData/backend`), typically an ngrok tunnel to the home server. Not the same as this worker's own URL.
- `WORKER_INTERNAL_TOKEN` — must equal `BACKEND_INTERNAL_TOKEN` on the backend.
- `ADMIN_SUPERUSER_ID` / `ADMIN_SUPERUSER_EMAIL` — terminal admin-chat identity.
- `N8N_CHAT_WEBHOOK_URL` / `N8N_CHAT_WEBHOOK_SECRET` — optional n8n handoff for admin-chat.

## Commands

```bash
pnpm dev            # wrangler dev, Postgres-backed if SUPABASE_SERVICE_ROLE_KEY is set
pnpm dev -- --mock  # in-memory mock stores, no Supabase needed (see forum.mock-store.ts)
pnpm test           # node --test, includes forum-moderation contract tests
pnpm typecheck
pnpm deploy         # wrangler deploy
```

From the `josedev` root, `pnpm dev:api:mock` is a shortcut for `pnpm -C josecoded-api dev -- --mock`.
