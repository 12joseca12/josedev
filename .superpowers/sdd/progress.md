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
