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
