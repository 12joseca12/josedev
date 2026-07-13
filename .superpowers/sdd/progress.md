# Fase 4b — public reskin + GSAP motion (subagent-driven, autonomous)
BASE = 14528f0

WS1: complete (commit 650f9c1, fonts JetBrains/DM Sans + header/footer/nav reskin + GSAP drawer). Grep anti-Material clean, colors pixel-exact light+dark, 139 tests. Note: footer copy "ARCHITECTURAL LOGIC" stale → copy pass WS7; terminal-chat header pending WS2 hero.
Next: WS2 (home hero 2-CTA + 7 sections + GSAP motion + Suspense fix). BASE = 650f9c1.

WS2: complete (commit 3bf3b91, home hero 2-CTA + 7 sections dash-* + useScrollReveal GSAP + Suspense fix + (site)/layout light-mode bg fix). 139 tests, home build unblocked, screenshots light/dark/mobile OK, grep clean.
  Notes: services-summary-section appears orphaned/unrouted (WS7 remove?); pre-existing hardcoded hex in contact-form select arrow; foro NOT in (site) so won't inherit the layout bg fix (WS5 handles foro bg).
Strategy: keep 4b on branch until all WS done, then merge once (coherent site).
Next: WS3 (sobre-mi + services). BASE = 3bf3b91.

WS3: complete (commit 3e5b99c, sobre-mi + services reskin + services-page-content client component). Subagent STALLED on degraded-disk preview; orchestrator verified (tsc clean, anti-Material grep clean) + committed. jest deferred to background (slow disk).
ENV NOTE: severe disk I/O degradation (fs bench 4061ms, dev server 3.6min) — stalling subagents on preview verification. ADAPTATION: remaining WS (blog/foro/auth/cleanup) verify via tsc+test+grep+code-review, NO dev-server; orchestrator does batched visual pass later.
Next: WS4 (blog). BASE = 3e5b99c.

Regression jest (post-WS3): 139/139 pass, 17 suites (608s slow disk). No regression.
WS4: complete (commit 3d60e6f, blog reskin — list/article/not-found + card/tags/markdown + blog-list-reveal/blog-article-reveal reusing useScrollReveal). tsc + anti-Material grep clean (broad). No-dev-server mode worked (no stall).
Next: WS5 (foro + fix /foro/new LAN-fetch blocker + foro bg since NOT in (site)). BASE = 3d60e6f.

WS5: complete (commit ff8d0eb, foro reskin + bg fix + force-dynamic on 5 foro routes + useScrollReveal). tsc + anti-Material grep clean. Build unverified (disk). Flagged pre-existing a11y aria-label bug via spawn_task chip.
Next: WS6 (auth + perfil + terminal widget). BASE = ff8d0eb.

WS6: complete (commit 23771e2, auth cyber-grid dropped + /auth bg + perfil + terminal dark-locked keeping character, 9 terminal files migrated). tsc + anti-Material grep clean. Fixed pre-existing auth mobile-h1 a11y bug.
ALL CONTENT WS (1-6) DONE. Next: WS7 cleanup (retire unused Material palette + cyan effects, keep terminal/device/chrome tokens) + visual pass + merge.

WS7 Part A: complete (staff-auth login/onboarding + scroll-progress + root skip-link migrated to dash-*; subagent stalled on disk, orchestrator finished). WHOLE SITE = 0 Material-semantic refs (grep-verified). staff-auth dark-locked (dark wrapper).
WS7 Part B DEFERRED: remove dead Material token DEFS from stylesVariables.ts + cyan effects from getGlobalUiCss() — do when disk healthy (needs build+visual; removing defs risks silent Tailwind class break uncatchable by tsc/test). Harmless dead code meanwhile.
4b content + migration COMPLETE. Remaining: visual pass (disk-blocked) + Part B (deferred) + merge to main.

---
# Fase 3b — Assets / Supabase Storage (subagent-driven)
BASE = 01dc22a
Plan: docs/superpowers/plans/2026-07-11-fase3b-assets-storage.md · Branch: fase-3b-assets
Running Tasks 1-2 only this session (pure/Jest); STOP before Task 3 (prod Supabase migration) for user OK.
Task 1: complete (commits 01dc22a..0fc20d8, review clean — spec ✅, quality Approved, 0 issues)
Task 2: complete (commits 0fc20d8..e83cf3e, review clean — spec ✅, quality Approved, 0 issues; both named risks verified)
STOPPED before Task 3 (prod Supabase migration) per user instruction — awaiting OK.
Task 3: complete (commits e83cf3e..8a52bf9 — migration+bucket+2-layer RLS+trigger APPLIED to prod, notify Edge Fn v3 deployed). Review found 1 Critical (DELETE layers disagreed) → FIXED (asset_uploader_of helper + storage DELETE realigned + storage_path CHECK), re-review Approved. get_advisors clean.
  MINOR for final review: (a) private.asset_uploader_of + client_id_of are RPC-callable to authenticated with arbitrary arg (accepted pattern, UUIDs non-enumerable); (b) notify copy strings differ from brief prose (kept clearer wording).
  COUPLING for Task 4: uploadAsset MUST pass id:assetId explicitly (same uuid as path) — DB CHECK client_assets_storage_path_scope enforces storage_path='clients/'||client_id||'/'||id. Relying on gen_random_uuid() default would violate the CHECK.
Task 4: complete (commit 8a52bf9..8568369, review Approved). Storage wrappers mirror clients-api (FetchResult, getSupabaseSSRBrowserClient, auth.getUser). CHECK coupling + delete-ordering correct + documented inline.
  MINOR for final review: (a) select("*") vs enumerated columns (clients-api enumerates); (b) deleteAsset returns {ok:false} if storage object already missing → UI retry could stall — handle gracefully in Task 5/6.
Task 5: complete (commit 8568369..efe5a57, review Approved). Client UI /area-clientes/assets: use-my-assets hook, assets-client, page, client-shell nav, clientPortal.* literals es+en. build 46/46, 145 tests, dash-* only, a11y OK.
  MINOR for final review: (a) download button no in-flight guard (double-click → 2 signed-url/window.open); (b) native file input not visually reset after upload (cosmetic).
Task 6: CODE ONLY this session (admin assets UI). Live e2e verification (Step 4-5: throwaway accounts, RLS isolation, Resend) DEFERRED to user — needs real accounts + running app.
Task 6: complete (code portion; commit efe5a57..06c1e49, review Approved). Admin assets section in admin-cliente-detail + use-admin-client-detail fetch. source:'admin' upload, delete on all rows, build 46/46, 145 tests. Only the 2 pre-accepted cosmetic Minors carried over.
ALL 6 TASKS CODE-COMPLETE + reviewed. DB migration live in prod. PENDING: final whole-branch review; then USER live e2e verification (throwaway accounts, RLS isolation, Resend); then merge decision.
ACCUMULATED MINORS for final review: T3(a) asset_uploader_of/client_id_of RPC-callable (accepted pattern, non-enum UUIDs); T4(a) select("*") vs enumerated cols; T4(b)+T5+T6 deleteAsset {ok:false} if object gone; download button no in-flight guard (client+admin); native file input not visually reset after upload (client+admin).
FINAL whole-branch review (opus): Ready to merge AFTER live verification. Two-layer RLS coherent/non-bypassable. Found 1 Important cross-task (orphan-cleanup RLS-denied for clients — comment corrected in follow-up commit; orphan bounded + deferred admin sweep per spec) + 2 Minors (svg-inline-script vector; uploaded_by_user_id exposed to client via select("*")). None merge-blocking. All 5 prior Minors: defer.
3b CODE-COMPLETE (Tasks 1-6) + reviewed + migration live in prod. NOT merged (branch fase-3b-assets). PENDING: USER live e2e verification; product decisions (SVG handling; uid-exposure via enumerated cols); merge.
B applied (commit c2bce1c): SVG→force-download {download:true}; uid→enumerate columns, dropped uploadedByUserId from DTO. typecheck+6 tests+build 46/46. Branch fase-3b-assets now 9 commits (0fc20d8..c2bce1c). Remaining: USER live e2e verification, then merge.

---
# Fase 3c — Comisiones internas (subagent-driven)
BASE = 56f36c8
Plan: docs/superpowers/plans/2026-07-12-fase3c-comisiones-internas.md (eng-reviewed, 9 findings folded) · Branch: fase-3c-comisiones
Running Task 1 only this session (pure/Jest); STOP before Task 2 (prod migration on the financial trigger) for user OK.
Task 1: complete (commits 56f36c8..572363d, review Approved; added drift test for the cents fix). 3 tests, suite green.
STOPPED before Task 2 (prod migration on the financial trigger private.leads_financial_integrity) per user instruction — awaiting OK.
Task 2: complete (commit 572363d..015d7d1 — commission_entries + RLS + trigger extension APPLIED to prod). Review Approved: all 4 eng-review fixes (P1-1 renamed var, P1-3 FOR UPDATE+estado guard, P2-4 paid_at check, P1-2 backfill) verified live. get_advisors clean.
  IMPORTANT follow-up (reviewer, before real payouts): no column-freeze on mark-paid — admin UPDATE could rewrite commission_amount/closer_user_id while flipping to paid. Documented-deferred (plan NOT-in-scope, P3 hardening). Add a BEFORE UPDATE column-freeze trigger before commissions are paid through this table.
STOPPED before Task 3/4 (UI + live verification) per user instruction — awaiting OK. Branch fase-3c-comisiones: 3 commits (19095b1..015d7d1).
