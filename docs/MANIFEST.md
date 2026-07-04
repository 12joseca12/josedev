# Root-doc cleanup manifest — 2026-07-02

Moved to reduce root clutter and token cost for future Claude Code sessions
(nothing deleted, all content preserved).

| Old path | New path | Why |
|---|---|---|
| `BACKEND_SNAPSHOT.md` | `docs/snapshots/BACKEND_SNAPSHOT.md` | Untracked stray duplicate of `backendSnapshot.md` (different casing, same generator). |
| `backendSnapshot.md` | `docs/snapshots/backendSnapshot.md` | Manually generated backend context dump, already gitignored. Superseded by the `Volumes-JosecodedData-backend` codebase-memory-mcp index — see root `CLAUDE.md`. |
| `supabase_freelance_portal_schema.sql` | `docs/legacy/supabase_freelance_portal_schema.sql` | Pre-migrations full-schema dump, already gitignored. Current schema source of truth is `supabase/migrations/*.sql`. |
| `masterPrompt.md` | `docs/masterPrompt.md` | Manual multi-agent kickoff prompt, git-tracked, unreferenced by any rule file — kept for reuse, just out of the repo root. |

Both snapshot files still exist as-is; they are historical, generated, gitignored
artifacts and were not edited or deduplicated further (content differs by 367 lines,
not a pure duplicate) to avoid destroying anything. Regenerate/retire them once the
MCP-backed `Volumes-JosecodedData-backend` index is the default way to give an
assistant backend context.
