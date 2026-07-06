# Fase 3a — progress ledger (subagent-driven-development)

Task 1: complete (commits 56c60f9..2f25fd0, schema+RLS, review clean — SPEC ✅, quality Approved)
  - get_advisors caught multiple_permissive_policies; fixed (split for-all + OR-merge INSERT); clean.
  - C1 hardening verified intact by reviewer.
  - MINOR to fold into Task 3: add idx_client_task_comments_author_user_id (FK sin índice; my constraint = index every new FK).
Grupo 3 (notify): index.ts + DEPLOY.md written (commit a40eb45); deploy BLOCKED on user secrets (TELEGRAM_BOT_TOKEN, RESEND_API_KEY + DNS).
Next: Task 3 (triggers). BASE = a40eb45.

Task 3: complete (commit 6030dde, triggers + author FK index, review clean — SPEC ✅, quality Approved, 0 findings)
  - Live-verified: is_upsell branch (no phantom client), upsell activate/reject+re-request, best-effort notify (404 tolerated).
  - Deviations (justified): migration filename 20260706150000 (collision), moddatetime via extensions schema.
  - notify Edge Function DEPLOYED (version 1, verify_jwt=false). Secrets + chat_id pending user.
Next: Task 7 (proxy guard: isClientAreaPath + resolveClientAccess + proxy branch, TDD). BASE = <ledger commit>.

Task 7: complete (commit 22ae857, proxy guard + tests, 94/94 passing, review clean — SPEC ✅, quality Approved)
  - Low finding (follow-up, non-blocking): double getUser() on redirect-away path; consider resolveClientAccess returning 3-state {no-session|not-client|client} to dedupe.
Wiring (orchestrator, outside task pipeline):
  - Found+fixed plan bug: staff_members.telegram_chat_id was missing from Task 1 SQL. Added via migration 20260706160000. get_advisors clean.
  - chat_id 1331981969 set on admin row (user sanchezgaricajosecarlos12@gmail.com). notify Edge Function deployed (verify_jwt=false); Telegram smoke test → HTTP 200 (ops path wired). Resend/email path pending domain (SPF/DKIM) verification — only needed for client-email, non-blocking.
  - tsconfig excludes supabase/functions (Deno) → tsc clean.
Next: Task 8 (relocate /area-clientes out of (site) into own shell).

Task 8: complete (commit f521e6a, relocate /area-clientes + client-shell, review clean — SPEC ✅, quality Approved)
  - Old (site)/area-clientes gone (rename verified on disk); client-shell = faithful mirror of staff dash-shell, client nav only, dark-only. 94/94 tests, tsc clean.
  - Trivial follow-up: stale doc-comment in src/lib/supabase/ssr-browser-client.ts:7 ("area-clientes todavía no tiene guard" — false since T7).
  - Pre-existing (not ours): next build static export fails on /foro/new LAN fetch.
Next: Task 9 (clients-api.ts service + admin server actions: provisionAccess, approveExtraDirect, sendExtraToPipeline, rejectExtra). BASE = <this ledger commit>.

Task 9: complete (commit c747ed0, clients-api + admin server actions, review clean — SPEC ✅, quality Approved)
  - Security verified: admin re-check first in all 4 actions (before service-role); service-client server-only (no browser leak); requestUpgrade solicitado-only; provisionAccess TOCTOU handled. 127 tests.
  - Created src/lib/supabase/service-client.ts (none existed). SUPABASE_SERVICE_ROLE_KEY absent from .env.local — USER must set it for actions to run in T12 live test.
  - MINOR to fold into T11: sendExtraToPipeline lacks estado='solicitado' guard (double-send = 2 leads). Add guard + test when wiring the button.
  - Design gap noted: provisionAccess(clientId, email) — email is admin-entered param (leads has no email column).
Next: Task 10 (client UI: proyecto/tareas/pack + phases helper). BASE = <this ledger commit>.

Task 10: complete (commit 568b5e3, client UI proyecto/tareas/pack + phases helper, review clean — SPEC ✅, quality Approved)
  - 132 tests. DESIGN.md/a11y verified (dark, dash tokens, one h1, min-h-11 touch targets, faithful fetch-hook mirror).
  - Follow-ups: (Medium) no client "browse catalog" fn — requestUpgrade only re-requests rechazado → fold: add listAvailableExtras + wire pack browse. (Low) N+1 listComments per task. (Trivial) inert ternary proyecto-client.tsx:429; pack-client reloads on failure.
Next: Task 11 (admin UI /admin/clientes + [id] + /admin/packs) + fold sendExtraToPipeline solicitado-guard. BASE = <this ledger commit>.
Deferred to Task 13 (post-T11): client upgrade-browse loop (listAvailableExtras + pack page wiring) + trivial cosmetics.

Task 11: complete (commit 024610f, admin UI + packs CRUD + sendExtraToPipeline guard, review clean — SPEC ✅, quality Approved)
  - Security verified: service-role isolation grep clean; 4 actions admin-checked; guard + real regression test. 133 tests.
  - Minors (non-blocking): pack catalog soft-delete only (no hard-delete); action import from bracketed route folder; parseMoney duplicated.
Next: Task 13 (client upgrade-browse: listAvailableExtras + pack page wiring; + cosmetics: proyecto ternary, pack reload-on-fail). BASE = <this ledger commit>.
Then: final whole-branch review → Task 12 live end-to-end verification (needs user SUPABASE_SERVICE_ROLE_KEY + throwaway accounts) → merge to main.
