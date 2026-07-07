# Fase 4a — Token Foundation (light/dark) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promover la paleta DESIGN.md (`dash-*`) a tokens globales con soporte light+dark vía un mecanismo class-based, sin romper el sitio público actual (que sigue con Material) ni los dashboards (que quedan dark-locked).

**Architecture:** Los tokens `dash-*` pasan de valores planos a pares light/dark. El generador emite, para los dash-*, refs `--color-dash-*: var(--dash-*)` en `@theme inline` + bloques `:root`/`.dark` con los valores reales. `.dark` en `<html>` (default por `prefers-color-scheme` sin FOUC + toggle en la nav). Los shells de staff/cliente fuerzan `.dark`. Material se queda intacto (dark-only) hasta el cleanup de 4e.

**Tech Stack:** Tailwind 4 (`@theme inline`, `@custom-variant`), Next 16, `scripts/generate-theme-css.ts` (`pnpm generate:theme`), Jest (consistency test).

## Global Constraints

- NO hand-editar el bloque generado de `globals.css` (entre marcadores `/* BEGIN/END GENERATED */`) — editar `stylesVariables.ts` + `pnpm generate:theme`.
- Los dashboards (`/admin`, `/closer`, `/area-clientes`) quedan **dark-locked** — nunca cambian con el toggle.
- El sitio público actual (Material) debe seguir **intacto y sin romperse** al terminar 4a (reskin real = 4b+).
- Nombres `dash-*` se mantienen (cero rename de dashboards).
- Valores exactos de DESIGN.md: bg `#F7F5F0`/`#141414`, surface `#FFFFFF`/`#1D1C1A`, text `#141414`/`#F7F5F0`, muted `#5C5851`/`#9C9890`, border `#E4E0D8`/`#322F2A`, accent `#C87D4A` (ambos), accent-text `#A85E2E`/`#D69466`, success `#4A7C59`, warning `#C89B3C`, error `#B0473F`, info `#4A7290`.
- `pnpm test` + `pnpm typecheck` verdes; verificación en vivo (preview) del toggle.

## File Structure

```
src/lib/stylesVariables.ts        # MODIFY: sacar dash-* de portfolioThemeColors → nuevo dashThemeColors {light,dark}
scripts/generate-theme-css.ts     # MODIFY: emitir refs @theme + bloques :root/.dark para dash-*
src/app/globals.css               # MODIFY (marcadores): nuevo bloque generado DASH-THEME + @custom-variant dark
<theme consistency test>          # MODIFY: cubrir el nuevo bloque generado (localizar el test existente)
src/app/[locale]/layout.tsx       # MODIFY: script inline anti-FOUC + clase inicial
src/components/**/theme-toggle.tsx# CREATE: toggle light/dark (client), persiste en localStorage
<public nav component>            # MODIFY: montar el theme-toggle junto al switcher ES·EN
src/components/staff-dash/dash-shell.tsx     # MODIFY: forzar `.dark` en el subtree
src/components/client-portal/client-shell.tsx# MODIFY: forzar `.dark` en el subtree
```

---

## Task 1: Reestructurar tokens dash-* a pares light/dark + generador + consistency test

**Files:** `src/lib/stylesVariables.ts`, `scripts/generate-theme-css.ts`, `src/app/globals.css`, el test de consistencia.

**Interfaces:**
- Produces: `dashThemeColors` (Record<string, {light,dark}>) exportado; `--color-dash-*` en @theme = `var(--dash-*)`; `:root`/`html.dark` setean `--dash-*`.

- [ ] **Step 1:** En `stylesVariables.ts`, quitar las 11 claves `dash-*` de `portfolioThemeColors` (dejando ahí solo la Material + chrome). Agregar:
```ts
/** DESIGN.md palette, light+dark. dash-* names kept as the global tokens (Fase 4a). */
export const dashThemeColors = {
  "dash-bg":          { light: "#F7F5F0", dark: "#141414" },
  "dash-surface":     { light: "#FFFFFF", dark: "#1D1C1A" },
  "dash-text":        { light: "#141414", dark: "#F7F5F0" },
  "dash-muted":       { light: "#5C5851", dark: "#9C9890" },
  "dash-border":      { light: "#E4E0D8", dark: "#322F2A" },
  "dash-accent":      { light: "#C87D4A", dark: "#C87D4A" },
  "dash-accent-text": { light: "#A85E2E", dark: "#D69466" },
  "dash-success":     { light: "#4A7C59", dark: "#4A7C59" },
  "dash-warning":     { light: "#C89B3C", dark: "#C89B3C" },
  "dash-error":       { light: "#B0473F", dark: "#B0473F" },
  "dash-info":        { light: "#4A7290", dark: "#4A7290" },
} as const satisfies Record<string, { light: string; dark: string }>;
```
- [ ] **Step 2:** En `generate-theme-css.ts`, importar `dashThemeColors`. Después del bloque COLORS existente, agregar dos nuevos bloques generados (nuevos marcadores en globals.css, ver Step 3):
  - En `@theme inline` (bloque `DASH-THEME-REFS`): `  --color-<key>: var(--<key>);` por cada dash token (así `bg-dash-bg` = `var(--dash-bg)`).
  - Bloque `DASH-THEME-VALUES` (fuera de @theme): `:root {\n  --dash-bg: #F7F5F0; ...\n}\nhtml.dark {\n  --dash-bg: #141414; ...\n}`. Reutilizar el helper `replaceBlock`.
- [ ] **Step 3:** En `globals.css`, agregar los marcadores `/* BEGIN/END GENERATED DASH-THEME-REFS */` dentro de `@theme inline` y `/* BEGIN/END GENERATED DASH-THEME-VALUES */` fuera; y `@custom-variant dark (&:where(.dark, .dark *));` (para que cualquier `dark:` util futura funcione). Correr `pnpm generate:theme` → llena los bloques.
- [ ] **Step 4:** Localizar el test de consistencia (el que "falla si el bloque drifta" — buscar por `generate-theme` / `replaceBlock` / lectura de `globals.css` en `src/**/*.test.ts` o `scripts/`). Extenderlo para cubrir los dos bloques nuevos (regenerar en memoria y comparar). Correr → verde.
- [ ] **Step 5:** `pnpm typecheck` + `pnpm test` verdes. Confirmar que `globals.css` ahora tiene `--color-dash-bg: var(--dash-bg)` y los bloques `:root`/`html.dark`. **Commit:** `feat(4a): dash-* tokens as light/dark global pairs + generator + consistency test`.

---

## Task 2: Mecanismo `.dark` — default por prefers-color-scheme sin FOUC

**Files:** `src/app/[locale]/layout.tsx` (o el root layout que renderiza `<html>`).

- [ ] **Step 1:** Leer el layout que emite `<html>`. Agregar en `<head>` un **script inline bloqueante** (antes del paint) que resuelve el modo inicial y setea la clase:
```tsx
<script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();` }} />
```
- [ ] **Step 2:** Confirmar que `<html>` NO tiene una clase de tema hardcodeada que pelee con esto. `pnpm typecheck`. **Commit:** `feat(4a): no-FOUC theme init script (prefers-color-scheme + localStorage)`.

---

## Task 3: Theme toggle en la nav pública

**Files:** `src/components/.../theme-toggle.tsx` (CREATE), el componente de nav pública (MODIFY).

**Interfaces:** Consumes nada. Produces `<ThemeToggle />` (client component).

- [ ] **Step 1:** Crear `theme-toggle.tsx` (`"use client"`): estado inicial leído de `document.documentElement.classList.contains('dark')` en `useEffect` (evita hydration mismatch — render neutro en SSR). onClick: flipea la clase `.dark` en `<html>`, escribe `localStorage.setItem('theme', next)`. Botón accesible (aria-label "Cambiar tema", ícono sol/luna de `lucide-react` que ya está en deps; touch target ≥44px; focus-visible ring con `dash-accent`).
- [ ] **Step 2:** Montar `<ThemeToggle />` en la nav pública, junto al switcher de idioma `ES·EN` (localizar el componente de nav — buscar el que renderiza el switcher de locale). NO montarlo en `dash-shell`/`client-shell` (staff/portal son dark-locked).
- [ ] **Step 3:** `pnpm typecheck` + `pnpm test`. **Commit:** `feat(4a): public theme toggle (light/dark, persisted)`.

---

## Task 4: Dashboards + portal dark-locked

**Files:** `src/components/staff-dash/dash-shell.tsx`, `src/components/client-portal/client-shell.tsx`.

- [ ] **Step 1:** En cada shell, envolver el contenido en un contenedor con `className="dark"` (o setear `.dark` en su root element) para que los tokens `dash-*` resuelvan a los valores dark **sin importar** el modo global. Como los shells ya usan `bg-dash-bg` etc., con esto quedan siempre oscuros aunque el público esté en light.
- [ ] **Step 2:** `pnpm typecheck` + `pnpm test`. **Commit:** `feat(4a): lock staff dashboards + client portal to dark`.

---

## Task 5: Verificación en vivo (preview)

- [ ] **Step 1:** `pnpm generate:theme` (idempotente), `pnpm typecheck`, `pnpm test` — todos verdes.
- [ ] **Step 2:** Preview: crear una superficie de prueba mínima con `bg-dash-bg text-dash-text` (o usar una ruta pública ya migrable). Confirmar: (a) el toggle flipea light↔dark; (b) `prefers-color-scheme` respetado en carga sin FOUC (probar con emulación dark/light); (c) contraste OK en ambos (`dash-text` sobre `dash-bg`, `dash-accent-text` sobre `dash-bg` ≥4.5:1); (d) navegar a `/admin` (o `/closer`) con el público en **light** → el dashboard sigue **dark**.
- [ ] **Step 3:** Confirmar que una página pública SIN migrar (p. ej. la home actual) sigue renderizando con Material, **sin romperse**. **Commit** (si hubo ajustes): `test(4a): verify theme switch live + dashboards dark-locked`.

---

## Self-review (hecho)
- Spec coverage: Sección A (tokens dual) → Task 1; Sección B (theming) → Tasks 2/3/4; Sección C (no-breaking) → constraint + Task 5 Step 3; Sección D (verificación) → Task 5. ✓
- Sin placeholders (el único "localizar el test/nav" es una búsqueda concreta, no un TBD de contenido).
- Consistencia de nombres: `dashThemeColors`, `--dash-*`, `--color-dash-*`, `.dark`, `ThemeToggle` usados consistentes.

## NOT in scope
Restyle visual de páginas (4b-4d), retiro de Material + efectos cyan (4e), hero de 2 CTAs (4b). Ver el spec.
