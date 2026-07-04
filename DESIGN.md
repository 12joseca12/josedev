# Design System — josedev.com

## Product Context
- **What this is:** A personal site that is also a real business platform — portfolio, blog, forum, client project portal, admin CRM/CMS, and a sales-closer panel.
- **Who it's for:** Recruiters, freelance clients, local-business clients (Jose's own web-agency venture, Spain-based), dev community readers, plus internal staff (Jose as admin, sales closers).
- **Space/industry:** Independent full-stack developer / small web agency.
- **Project type:** Hybrid — marketing site + editorial (blog/forum) + internal business app (CRM/admin/client portal).
- **Memorable thing:** After seeing this site for the first time, someone should think *"this guy really knows what he's doing."* Every decision below serves that — credibility through restraint and real function, not decoration or hype copy.

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian, terminal-real.
- **Decoration level:** Intentional (subtle, not bare-minimal, not expressive).
- **Mood:** Function proves competence. The site's existing terminal-styled chat widget is a real, working interface — not a decorative screenshot — and that authenticity is the design's spine.
- **Reference sites:** [joshwcomeau.com](https://www.joshwcomeau.com/) (warm/illustrated — studied, not followed: too playful for this positioning), [leerob.com](https://leerob.com/) (minimal/serif/restrained — closest match in spirit), [rauchg.com](https://rauchg.com/) (tabular/data-dense — informed the admin/CRM density approach). Synthesis: all three earn credibility through restraint and real content density, not decoration. None of them has to serve 4 distinct audiences + real internal tooling the way this site does — that's this project's own problem to solve, not theirs.

## Typography
- **Display/Hero/Headlines:** JetBrains Mono, 700 — deliberate risk: monospace as the *primary* display face site-wide, not just an accent for code/terminal moments. Breaks from every researched reference (all three use humanist sans/serif for headlines). Cost: reads more raw/technical than polished to non-technical visitors (the local-business client audience specifically) — accepted because it reinforces "this is real, not a template" for the audiences that matter most (recruiters, freelance clients, dev community).
- **Body:** DM Sans, 400/500 — warm-neutral, legible for long-form blog posts and forum threads.
- **UI/Labels:** DM Sans, 500-600.
- **Data/Tables:** Geist (tabular-nums) — admin/CRM/closer dashboards, anywhere numbers need to align (leads tables, commission ledger, analytics).
- **Code/Terminal:** JetBrains Mono — same family as headlines, reinforcing coherence between "the terminal is real" and "the typography is real."
- **Loading:** Google Fonts CDN (`JetBrains+Mono`, `DM+Sans`, `Geist`) — self-host later if performance budget demands it.
- **Scale:** Hero 40-46px / H2 28px / H3 20px / Body 16px / Small 13-14px / Data 13-14px (tabular-nums).

## Color
- **Approach:** Restrained — near-black/near-white base, one accent used sparingly and meaningfully.
- **Primary (accent):** `#C87D4A` (soft warm amber/terracotta — a muted nod to CRT-phosphor amber, not a saturated neon glow). Used for **large UI elements only** (buttons, borders, cursor blink, active-state fills) where the 3:1 non-text contrast minimum applies. Deliberately NOT the blue/teal expected of every dev portfolio.
- **Accent-text (light mode):** `#A85E2E` — a darkened variant for **inline body-sized links/text**. `#C87D4A` measures ~3:1 against `#F7F5F0`, which fails WCAG AA for normal text (needs 4.5:1); `#A85E2E` measures ~4.5:1 and passes. Never use `#C87D4A` for text-sized links on the light background — use `#A85E2E`.
- **Accent-text (dark mode):** `#D69466` against `#141414` clears 4.5:1 with margin — no separate darkened variant needed in dark mode.
- **Background:** `#F7F5F0` (light) / `#141414` (dark).
- **Surface:** `#FFFFFF` (light) / `#1D1C1A` (dark).
- **Text:** `#141414` (light) / `#F7F5F0` (dark). Muted text: `#5C5851` (light) / `#9C9890` (dark).
- **Border:** `#E4E0D8` (light) / `#322F2A` (dark).
- **Semantic:** success `#4A7C59`, warning `#C89B3C`, error `#B0473F`, info `#4A7290`.
- **Dark mode:** Full surface redesign (not just inverted), accent brightens slightly (`#D69466`) to keep the same perceived warmth against a dark background.

## Spacing
- **Base unit:** 8px.
- **Density — dual, deliberately:** *Comfortable* on public marketing/editorial pages (home, sobre-mí, servicios, blog, foro). *Compact* on internal dashboards (admin, closer, client portal) — these are real data tools used daily, not marketing surfaces, and density there is a feature, not a compromise.
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Approach:** Hybrid — grid-disciplined for admin/closer/client-portal (real dashboards, strict columns), editorial freedom for home/blog/sobre-mí.
- **Grid:** 12-column on desktop, 4-column on mobile, standard 24px gutter.
- **Max content width:** 1180px (marketing/editorial), full-bleed sidebar layout for dashboards.
- **Border radius:** sm 3px / md 6px / lg 10px / full 9999px — tight, not the bubbly rounded-everything look.

## Home Hero (revised after preview feedback)
The first proposal used 3 equal-weight labeled cards (Reclutador / Cliente / Comunidad) splitting the hero. **Rejected as too explicit/form-like.** Revised to:
- **One strong headline + short supporting line**, no audience labels visible in the hero itself.
- **Two understated CTAs only:** one aimed at recruiters (routes to the "sabe lo que hace" proof — stack, experience, engineering showcase), one aimed at hiring/project work (routes to the freelance + negocio-local client path). Styled as quiet, confident buttons — not competing colorful cards.
- **"Comunidad" (blog/foro) is NOT a hero-level choice** — it lives in normal header navigation, reached through browsing rather than being pitched at first sight. Less commercially urgent than the two CTAs, so it recedes.
- The terminal/CLI widget stays as a **secondary, supporting element below the fold** (or as the actual admin-chat interface) — never the primary navigation mechanism, specifically to avoid alienating non-technical local-business clients.

## Motion
- **Library:** GSAP (`gsap`, `@gsap/react` with the `useGSAP` hook, `ScrollTrigger`) — already installed as a skill in this environment, use it rather than ad-hoc CSS transitions or a second animation library.
- **Approach:** Minimal-functional in *intent* (motion aids comprehension, nothing decorative-for-its-own-sake), but **smooth and premium in execution** — this is not the same as "no animation." Use considered easing (GSAP `power2.out`/`power3.inOut`, not linear or default ease) and short-to-medium durations.
- **Durations:** micro 80ms / short 180ms / medium 320ms / long 500ms.
- **Where motion earns its place:** hero entrance (subtle stagger, not a slideshow), ScrollTrigger-based reveals on the editorial pages (blog, sobre-mí) as content enters view, the terminal cursor blink and typing indicator (already functional, keep as-is), state transitions in the admin/closer dashboards (row updates, kanban drag) — always confirming an action happened, never decorating an idle state.
- **Respect `prefers-reduced-motion`** — GSAP's `matchMedia` should gate all non-essential motion.

## UI Feedback Patterns (alerts, toasts, modals)
Not covered in the first preview pass — added per explicit feedback that these need real UX thought, not just a static inline `<div class="alert">`.
- **Inline alerts** (as shown in the preview: success/warning/error/info, left-border accent) — for persistent, in-context state (e.g., "2 leads sin asignar" on the admin dashboard).
- **Toasts** — for transient confirmations (lead reassigned, comment posted, MFA enrolled). Bottom-right on desktop, bottom-center on mobile, auto-dismiss 4-6s, manually dismissable, one at a time (queue, don't stack more than 2). Animate in/out with GSAP (slide + fade, ~200ms), not a plain CSS transition.
- **Modals/dialogs** — reserved for destructive or one-way confirmations (revert a lead's "cerrado" state, delete a blog post, reset a closer's MFA) — matches the "confirmation protocol" already established for financially-sensitive actions in the architecture layers. Backdrop dim + scale-in (GSAP), not a jarring instant appear.
- All feedback components use the same color tokens/border-radius as the rest of the system — no separate "alert design language."

## Responsive Strategy
Explicit priority, not an afterthought — this site has real non-technical visitors (local-business clients) who will often be on a phone.
- **Mobile-first breakpoints:** base (< 640px), `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px) — standard Tailwind scale, no custom breakpoints invented.
- **Public/editorial pages (home, blog, foro, servicios):** single-column below `md`, the 12-column grid only applies `lg`+. Hero headline scale drops to 28-32px below `sm` — JetBrains Mono at 46px does NOT shrink gracefully on a 375px viewport without becoming cramped; verify this specifically given the bold display-font choice.
- **Admin/closer/client-portal dashboards:** the compact-density grid (sidebar + table) collapses to a bottom tab bar + stacked cards below `md` — a data table with 4+ columns does not work on mobile width, don't force it, redesign the row as a card.
- **Terminal/CLI widget:** never full-width on mobile in a way that requires horizontal scroll — cap its width and let content wrap, or collapse it to a single-line prompt that expands on tap.
- **Touch targets:** minimum 44×44px for any tappable element (buttons, nav items, table row actions) — the compact admin density on desktop does NOT carry over to touch contexts; pad tap targets even when the visual density stays tight.

## Accessibility
Explicit priority — several choices in this system (monospace display type, a warm accent color, high content density on dashboards) need concrete mitigations, not just good intentions.
- **Color contrast:** see the Color section above — `#C87D4A` is UI-only (3:1 minimum), `#A85E2E`/`#D69466` are the text-safe variants (4.5:1). Enforce this distinction in the Tailwind theme tokens (e.g., `accent` vs `accent-text`), not just as a design-doc note that's easy to forget mid-implementation.
- **Focus states:** every interactive element gets a visible `:focus-visible` ring using the accent color at full UI-strength (`#C87D4A`/`#D69466`, 3:1 is sufficient for a focus indicator) — never rely on the browser default, never remove it without replacing it.
- **Monospace display type at small sizes:** JetBrains Mono headlines get slightly increased `line-height` (1.15-1.2 instead of a tighter display default) and are capped in length on mobile — if a headline needs more than ~40 characters at the smallest breakpoint, break it into two lines deliberately rather than letting it shrink further.
- **Reduced motion:** already specified in Motion — GSAP `matchMedia` must gate ALL non-essential animation, including ScrollTrigger reveals. Content must be fully visible/usable with zero JS/motion as the floor.
- **Semantic structure:** one `<h1>` per page, heading levels in order (no skipping to make something "look right" visually — use CSS for visual sizing, not heading level), all form inputs (login, contact, closer's lead form) have real associated `<label>` elements, not placeholder-as-label.
- **Keyboard navigation:** the segmented hero CTAs, the terminal/CLI widget, and the admin kanban (drag-and-drop for lead reassignment) all need a full keyboard-operable path — drag-and-drop especially needs a keyboard-accessible alternative (e.g., a "move to..." menu action), not just mouse drag.
- **Dark mode contrast re-check:** don't assume dark mode "just works" because it inverts — re-verify the muted-text colors (`#9C9890` on `#141414`, `#5C5851` on `#F7F5F0`) against real body-text contrast requirements, not just the accent.

## Navigation
Elegant but clear — the header carries more weight now that the hero dropped the 3-card split (Comunidad lives here, not in the hero).
- **Desktop:** persistent top bar, not overlaid on hero content. Left: `josedev` wordmark (JetBrains Mono, matches headline typography — reinforces the type system instead of using a separate logo treatment). Right: `Sobre mí` · `Servicios` (dropdown or two direct links: Freelance / Negocios locales) · `Blog` · `Foro` · a distinct, quieter `Iniciar sesión` / account entry point (client `/auth`, not the staff route). Language switcher (`ES · EN`) stays visually minor, top-right corner.
- **No icon-only nav items** — every nav item is a text label; this isn't a dashboard-density context, cryptic icons cost more clarity than they save space at this scale (5-6 items max).
- **Mobile:** collapses to a hamburger/drawer below `md`, NOT a bottom tab bar (bottom tabs fit an app; this is still primarily a content/marketing site with an app-like portal behind login). Drawer opens with a GSAP slide-in (~200ms), full labels, same order as desktop.
- **Admin/closer/client-portal nav is a SEPARATE, distinct nav** (the sidebar shown in the preview mockup) — never merge it with the public header. A staff member or client inside their portal should never see the public marketing nav items; the portal is its own contained shell.
- **Active state:** current section marked via the accent-text color + a subtle underline/left-border (matches the admin sidebar's `active` pill treatment already shown in the preview) — consistent active-state language across public nav and internal nav, even though the layouts differ.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-04 | Initial design system created | `/design-consultation`, informed by the office-hours discovery + 3-layer architecture already locked in for this redesign. |
| 2026-07-04 | Researched joshwcomeau.com, leerob.com, rauchg.com via `browse` | All three respected devs earn credibility through restraint/content density, not decoration — set the Layer-1 baseline for this system. |
| 2026-07-04 | Chose Industrial/Utilitarian + terminal-real over safer options | Ties directly to the existing terminal-chat widget already built in the codebase and to the "sabe lo que hace" positioning. |
| 2026-07-04 | Escalated risk level on user request, then partially walked back | Monospace-as-primary-display and the tasteful (not saturated) accent survived; a fully-CLI-driven primary navigation did not — accessibility/non-technical-audience cost was too high for the two client-facing audiences that matter commercially. |
| 2026-07-04 | Reworked hero from 3 equal cards → 2 understated CTAs + no visible "Comunidad" card | First preview's 3-card split read as too explicit/form-like ("subliminal" was the explicit user ask). Blog/foro demoted to normal nav. |
| 2026-07-04 | Motion system specified as GSAP, not plain CSS | User explicitly asked for "smooth and premium" animation and pointed at the GSAP skills already installed in this environment — Search Before Building: use what's already set up rather than a new library. |
| 2026-07-04 | Added toast/modal patterns | Missing from the first preview pass; user flagged that alert/popup UX needed real design thought, not an afterthought. |
| 2026-07-04 | Found and fixed a real contrast failure: `#C87D4A` on `#F7F5F0` measures ~3:1, fails WCAG AA text (4.5:1) | Split into `accent` (UI/large elements, 3:1 sufficient) vs `accent-text` (`#A85E2E` light / `#D69466` dark, 4.5:1) — caught before implementation, not after an audit. |
| 2026-07-04 | Added Responsive Strategy, Accessibility, and Navigation as explicit sections | User flagged these as priorities needing real design thought (not implied by the rest of the system) — specifically the mobile behavior of the bold monospace display type, keyboard/focus/motion-reduction concerns, and a header nav that now carries more weight after the hero was simplified to 2 CTAs. |
