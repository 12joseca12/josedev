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
