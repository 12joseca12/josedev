# Fase 4b — public reskin + GSAP motion (subagent-driven, autonomous)
BASE = 14528f0

WS1: complete (commit 650f9c1, fonts JetBrains/DM Sans + header/footer/nav reskin + GSAP drawer). Grep anti-Material clean, colors pixel-exact light+dark, 139 tests. Note: footer copy "ARCHITECTURAL LOGIC" stale → copy pass WS7; terminal-chat header pending WS2 hero.
Next: WS2 (home hero 2-CTA + 7 sections + GSAP motion + Suspense fix). BASE = 650f9c1.

WS2: complete (commit 3bf3b91, home hero 2-CTA + 7 sections dash-* + useScrollReveal GSAP + Suspense fix + (site)/layout light-mode bg fix). 139 tests, home build unblocked, screenshots light/dark/mobile OK, grep clean.
  Notes: services-summary-section appears orphaned/unrouted (WS7 remove?); pre-existing hardcoded hex in contact-form select arrow; foro NOT in (site) so won't inherit the layout bg fix (WS5 handles foro bg).
Strategy: keep 4b on branch until all WS done, then merge once (coherent site).
Next: WS3 (sobre-mi + services). BASE = 3bf3b91.
