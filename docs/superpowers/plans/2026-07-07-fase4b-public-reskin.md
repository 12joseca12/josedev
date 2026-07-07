# Fase 4b — Public reskin + GSAP motion Implementation Plan

> Subagent-driven, autonomous (user authorized full autonomy — no approval gates). Design spec = **DESIGN.md** (repo root). Tokens = Fase 4a (`dash-*` global light/dark). Verification is visual (preview + DESIGN.md/web-design-guidelines compliance) + no broken pages + no residual Material refs in touched files.

**Goal:** Rediseñar TODO el sitio público a la estética DESIGN.md (industrial/utilitarian, JetBrains Mono display, ámbar `dash-accent`, restraint — sin glow/gradientes cyan) y añadir motion GSAP (entrance + ScrollTrigger reveals, reduced-motion gateado), coherente en toda la web.

**Tech Stack:** Next 16 / React 19 / Tailwind 4, tokens `dash-*` (4a), GSAP + `@gsap/react` (`useGSAP`), ScrollTrigger. Fuentes next/font.

## Global Constraints
- DESIGN.md es la fuente de verdad visual. Tokens `dash-*` (nunca Material/`primary-container`/`tertiary`/etc. en componentes reskineados; nunca hex crudos).
- Tipografía DESIGN.md: **display/headlines JetBrains Mono 700**, **body DM Sans 400/500**, data Geist. Escala: hero 40-46px (28-32 en <sm), H2 28, H3 20, body 16.
- Color: `dash-accent` (#C87D4A) SOLO UI grande (3:1); `dash-accent-text` para texto/links (4.5:1). Nunca accent para texto.
- Motion GSAP: `useGSAP` (`@gsap/react`), `ScrollTrigger` para reveals editoriales, hero stagger sutil. Duraciones micro 80 / short 180 / medium 320 / long 500ms, easing `power2.out`/`power3.inOut`. **`gsap.matchMedia()` con `(prefers-reduced-motion: no-preference)` gatea TODO lo no-esencial**; contenido usable sin JS/motion como piso. El repo ya usa GSAP en `dash-toast`/`dash-modal` — mismo patrón.
- Radius DESIGN.md: sm 3px / md 6px / lg 10px / full 9999px. Spacing base 8px. Max content 1180px marketing.
- A11y: un `<h1>` por página, headings en orden, focus-visible ring `dash-accent`, touch ≥44px, labels reales.
- Public switchea light/dark (Fase 4a); verificar el look en AMBOS modos.
- NO tocar dashboards/portal (dark-locked) ni schema/DB.
- Cada workstream: `pnpm typecheck` + `pnpm test` verdes; preview screenshot en light+dark; confirmar cero refs Material en los archivos tocados (`grep -E 'primary-container|tertiary|on-surface|signature-glow|hero-accent-text|text-glow'`).

---

## WS1 — Fundación compartida (fuentes + chrome + primitives)
**Files:** `src/app/[locale]/layout.tsx` (fuentes public → JetBrains Mono/DM Sans), `src/components/portfolio/site-header.tsx` + `site-header-client.tsx`, `src/components/portfolio/site-footer.tsx`, `src/components/nav/*`, y cualquier primitive de botón/link/card compartido.
- Cargar JetBrains Mono (display) + DM Sans (body) vía next/font en el layout público, setear las CSS vars que el `@theme` mapea (`--font-jetbrains-mono`, `--font-dm-sans` → `--font-dash-mono`/`--font-dash-sans`). El wordmark `josedev` en JetBrains Mono (DESIGN.md nav).
- Reskin del header (top bar persistente, wordmark, `Sobre mí · Servicios · Blog · Foro · Iniciar sesión`, switcher ES·EN + theme-toggle), footer, y el drawer mobile (GSAP slide-in ~200ms). Tokens `dash-*`, active-state accent-text + underline/left-border.
- Hover-labels/tooltips: migrar del efecto Material al token system.
**Deliverable:** todas las páginas heredan la tipografía + chrome nuevos; el sitio ya "se siente" DESIGN.md aunque el contenido de cada página siga por reskinera.

## WS2 — Home + motion
**Files:** `src/app/[locale]/(site)/page.tsx`, `src/components/portfolio/{hero,differentials,stack,bento,faq,contact,final-cta,services-summary}-section.tsx`.
- **Hero (DESIGN.md "Home Hero"):** un headline fuerte + línea de apoyo, **2 CTAs discretos** (uno a la prueba "sabe lo que hace" → sobre-mí/stack; otro a contratar → servicios), SIN labels de audiencia, SIN 3 cards. Terminal/CLI widget como elemento secundario debajo del fold (no navegación primaria). GSAP: entrance stagger sutil del hero (no slideshow).
- Secciones: restilar a DESIGN.md (retirar glass/glow/gradientes cyan). ScrollTrigger reveals al entrar en viewport (reduced-motion gateado).
- **Fix blocker:** envolver el uso de `useSearchParams` de la home en `<Suspense>` (destraba `next build`).

## WS3 — Sobre-mí + Servicios
**Files:** `src/components/sobre-mi/*`, `src/app/[locale]/(site)/sobre-mi/page.tsx`, `src/app/[locale]/(site)/services/page.tsx` (+ sus componentes).
- Reskin a DESIGN.md (editorial, comfortable density). ScrollTrigger reveals. El emulador Android / device-frame: migrar tokens (bug del server nvm es aparte, TODOS.md).

## WS4 — Blog
**Files:** `src/components/blog/*`, `src/app/[locale]/(site)/blog/page.tsx` + `[slug]/page.tsx`.
- Lista + artículo, tipografía de lectura larga (DM Sans body, JetBrains Mono headings), ScrollTrigger reveals editoriales.

## WS5 — Foro (+ fix LAN-fetch)
**Files:** `src/components/forum/*`, `src/app/[locale]/foro/*`.
- Reskin a DESIGN.md. **Fix blocker:** el fetch build-time de `/foro/new` a IP de LAN → hacerlo resiliente/client-side (destraba `next build`).

## WS6 — Auth + Perfil + Terminal widget
**Files:** `src/components/auth/*`, `src/components/profile/*`, `src/components/terminal/*` (+ `(site)/perfil`, `/auth`).
- Auth público + `/perfil` a DESIGN.md. El terminal chat widget: DESIGN.md dice mantenerlo (es "real") — migrar sus tokens al system sin perder el carácter terminal; capar ancho en mobile (no scroll horizontal).

## WS7 — Cleanup + design-review final
**Files:** `src/lib/stylesVariables.ts` (retirar `portfolioThemeColors` Material), `scripts/generate-theme-css.ts` + `globals.css` (bloque COLORS Material), `getGlobalUiCss()` (retirar efectos cyan: signature-glow, hero-accent-text, text-glow, cyber-grid).
- Solo cuando NINGUNA página referencie Material ni los efectos (grep global limpio). Regenerar tema, consistency test, tests.
- **Pasada final de design-review** sobre todo el sitio (light+dark, mobile+desktop): consistencia, jerarquía, spacing, a11y, motion.

---

## Ejecución
Subagent-driven en `fase-4b-public-reskin`. Cada WS: implementer + verificación visual (preview light+dark) + `grep` anti-Material. Merge+push a `main` en milestones coherentes (foundation+home = primer milestone). Autónomo, sin gates de aprobación (autorizado por el usuario).
