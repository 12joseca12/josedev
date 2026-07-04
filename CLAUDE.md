# CLAUDE.md

Follow `AGENTS.md` @AGENTS.md as the repository source of truth for coding
rules. This file covers exploration strategy only.

## Codebase Memory MCP workflow (use this before grep/find/Glob/broad reads)

This system spans multiple projects. Indexed in `codebase-memory-mcp`:

| Project name | Path | What it is |
|---|---|---|
| `Users-jose-Documents-GitHub-josedev` | `/Users/jose/Documents/GitHub/josedev` | Next.js frontend **and** `josecoded-api` (Cloudflare Worker gateway, workspace subfolder — see `docs/ARCHITECTURE.md`) |
| `Volumes-JosecodedData-backend` | `/Volumes/JosecodedData/backend` | Internal Fastify worker (home server), not public-facing |

`/Volumes/JosecodedData/knowledge` and `/Volumes/JosecodedData/storage` are
**data volumes, not code** — don't index or grep them broadly. Read
`knowledge/README.md` / `storage/README.md` directly instead; they're small
and describe conventions and hardcoded filenames.

Workflow, in order:
1. `get_architecture(project)` — structure/clusters, before touching files.
2. `search_graph` / `search_code` (BM25/semantic/pattern) to find the actual
   function, route, or file — instead of grep/find/Glob.
3. `trace_path(function_name, mode=calls|data_flow|cross_service)` for
   callers/callees and impact analysis.
4. `get_code_snippet(qualified_name)` for exact source — only after the
   graph has named the symbol. Don't read whole files speculatively.
5. If a project here isn't indexed yet, or `index_status` looks stale
   relative to recent changes, run `index_repository` first.

## Tracing frontend → API/proxy → backend flows

There are **no static imports** across `josedev` → `josecoded-api` →
`backend` — they're connected by env vars and HTTP calls at runtime, which
won't fully show up as graph edges. To trace a flow:
1. `search_graph(label="Route")` in each project to see its HTTP surface.
2. Find the client call in `josedev/src/services/*.ts` (`getApiBase()` /
   `fetch(...)` pattern) — it reads `NEXT_PUBLIC_JOSECODED_API_URL`.
3. Find the matching route in `josedev/josecoded-api/src/modules/*.routes.ts`.
4. If that route proxies further (`worker.service.ts`, `WORKER_URL`), find
   the matching route in `Volumes-JosecodedData-backend`'s `src/modules/*`.
5. Full env-var contract table: `docs/ARCHITECTURE.md`.

## ADRs

Read via `manage_adr(project, mode="get")` on both projects above before
making architectural changes — they record why `josecoded-api` is a
subfolder (not a separate repo), the knowledge/storage layout constraints,
and what was deliberately left alone in the 2026-07-02 refactor.

## Supabase / n8n

- Supabase schema lives in `supabase/migrations/*.sql` (this repo) — that's
  the source of truth, not `docs/legacy/supabase_freelance_portal_schema.sql`
  (superseded pre-migrations dump, kept for history only).
- n8n workflow definitions: `n8n/*.workflow.json` (this repo). The backend
  triggers/receives n8n webhooks (`src/modules/n8n` in the backend project);
  `josecoded-api` can also hand off admin-chat to n8n
  (`N8N_CHAT_WEBHOOK_URL`).

All persistent rules and execution behavior are otherwise defined in:
- `AGENTS.md`
- `.cursor/rules/*`

## Design System

Always read `DESIGN.md` before making any visual or UI decisions. All font
choices, colors, spacing, motion, and aesthetic direction are defined there —
including the GSAP-based motion system and the toast/modal feedback patterns.
Do not deviate without explicit user approval. In QA mode, flag any code that
doesn't match `DESIGN.md`.
