# System architecture

```
                    browser
                       │
                       ▼
   ┌───────────────────────────────────────┐
   │  josedev (this repo)                    │  Next.js 16 / React 19, Vercel
   │  src/app        - App Router routes      │
   │  src/components - UI                     │
   │  src/services    - client-side API calls │
   │  src/lib         - types, literals, style │
   │                    tokens, Supabase client│
   └───────────────────┬────────────────────┘
                        │ NEXT_PUBLIC_JOSECODED_API_URL
                        ▼
   ┌───────────────────────────────────────┐
   │  josecoded-api (workspace subfolder)    │  Cloudflare Worker (Hono)
   │  src/modules   - HTTP routes            │  deployed independently
   │  src/services  - forum/admin-chat/proxy │  (own wrangler deploy)
   │  Talks to Supabase directly (forum,     │
   │  admin-chat). Proxies /ai/*, /demo/*,   │
   │  /system/* to the backend.              │
   └───────────────┬─────────────┬─────────┘
                    │             │ WORKER_URL + WORKER_INTERNAL_TOKEN
                    │             ▼
                    │   ┌─────────────────────────────────────┐
                    │   │  backend                              │  Fastify, home server
                    │   │  /Volumes/JosecodedData/backend        │  (internal only, never
                    │   │  src/modules/{ai,emulator,health,      │   public-facing)
                    │   │    n8n,storage,system}                 │
                    │   │  Controls: Ollama, Docker Android       │
                    │   │  emulator, n8n triggers, local          │
                    │   │  knowledge + storage volumes            │
                    │   └───────┬─────────────────┬─────────────┘
                    │           ▼                 ▼
                    │   /Volumes/JosecodedData/  /Volumes/JosecodedData/
                    │   knowledge                storage
                    ▼
              Supabase (Postgres + Auth)
              - forum tables, admin_superusers, admin_chat*, blog_posts
              - migrations: supabase/migrations/*.sql (this repo)
```

## Why josecoded-api is a subfolder, not a separate repo

It is architecturally a **separate deployable** (own runtime, own
`wrangler deploy`, own package.json) but is kept inside the `josedev` git
repo rather than split into its own repository, because:

- It already had zero independent git history of its own (no `.git` in the
  original standalone scaffold at `/Users/jose/Documents/GitHub/josecoded-api`,
  since archived — see `_archive/josecoded-api-standalone-legacy-2026-07-02/`).
- `josedev`'s `package.json` (`dev:api:mock`), `README.md`, and `.gitignore`
  were already written assuming this layout.
- It shares an env-var contract with `josedev` (`NEXT_PUBLIC_JOSECODED_API_URL`
  ↔ `PUBLIC_API_BASE_URL`) that's easier to keep in sync in one repo/PR.

It remains logically separate: different `package.json`, different runtime
(Cloudflare Workers vs Node/Vercel), independent deploy, and — critically — a
real security boundary (see `josecoded-api/README.md` and
`backend/AGENTS.md`): browser traffic must terminate at `josecoded-api`, never
reach the internal `backend` worker directly.

## Cross-repo/volume env-var contract

| Var | Set in | Points to |
|---|---|---|
| `NEXT_PUBLIC_JOSECODED_API_URL` | `josedev/.env.local` | `josecoded-api` base URL |
| `PUBLIC_API_BASE_URL` | `josecoded-api/.dev.vars` | itself (local wrangler dev) |
| `WORKER_URL` | `josecoded-api/.dev.vars` (wrangler var) | `backend` base URL (ngrok tunnel to home server) |
| `WORKER_INTERNAL_TOKEN` (api) / `BACKEND_INTERNAL_TOKEN` (backend) | both `.dev.vars`/`.env` | shared secret, must match |
| `KNOWLEDGE_DIR` | `backend/.env` | `/srv/josecoded-data/knowledge` = `/Volumes/JosecodedData/knowledge` |
| `STORAGE_ROOT` + `STORAGE_*_DIR` | `backend/.env` | `/srv/josecoded-data/storage` = `/Volumes/JosecodedData/storage` |

These links are dynamic/runtime (env vars, not static imports), which is why
they don't show up as edges in the codebase-memory-mcp graph — trace them
manually via `.env.example` / `.dev.vars.example` files, not code search.

## ADRs

See `codebase-memory-mcp` ADRs on the `Users-jose-Documents-GitHub-josedev`
and `Volumes-JosecodedData-backend` projects (`manage_adr` tool) for the
recorded decisions behind this structure.
