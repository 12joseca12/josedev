# Fase 4a — Fundación de tokens (light/dark, no-breaking) — Design Spec

Date: 2026-07-07
Branch: main (implementación en `fase-4a-token-foundation`)
Status: design approved (brainstorming), pending writing-plans
Depends on: Fases 1-3a implementadas (main `60e1d55`). DESIGN.md (raíz) = sistema de diseño (fuente de verdad visual).

## Contexto y descomposición

Fase 4 (rediseño visual del sitio público) se descompone en:
- **4a — Fundación de tokens (ESTE SPEC):** promover la paleta DESIGN.md a tokens globales con light+dark, mecanismo de theming, sin romper nada. Base de todo lo demás.
- **4b — Home:** las 7 secciones + hero de 2 CTAs; fix del blocker `useSearchParams`/Suspense.
- **4c — Editorial:** sobre-mí + blog.
- **4d — Foro** (`src/app/[locale]/foro/`); fix del blocker del fetch a LAN de `/foro/new`.
- **4e — Cleanup:** retirar la paleta Material + efectos cyan una vez que ninguna página los referencia.

**Hallazgo que encuadra Fase 4:** el sitio público hoy NO es "DESIGN.md sin tokens" — usa una paleta **Material cyan/teal/mint** (`portfolioThemeColors` en `stylesVariables.ts`, export de Stitch) con efectos glass/glow/gradientes cyan (`getGlobalUiCss()`), que contradicen el "función sobre decoración / restraint" de DESIGN.md. Fase 4 es un **reskin real** a la estética industrial/ámbar, no solo aplicar tokens faltantes.

## Decisiones fundacionales (cerradas en brainstorming)

- **Light + dark desde la fundación** (Q1=A): DESIGN.md diseñó ambos modos a propósito (bg light `#F7F5F0` / dark `#141414`, variantes de contraste de texto distintas). 4a es la capa correcta para el mecanismo; hacerlo dark-only y retrofitear light después rehace la fundación.
- **Nombres `dash-*` como globales** (Q2=A): se mantienen los nombres `dash-*` (extendidos con valores light/dark) como los tokens globales. **Cero churn en los dashboards** recién enviados (Fase 2 + 3a); solo se remapea el público (que hay que tocar igual). El prefijo `dash-` como global es un wart cosmético aceptado.
- **Dashboards dark-locked:** no reciben light mode (herramienta de datos, dark es feature per DESIGN.md). El switch light/dark aplica solo al público. El `dash-shell` fuerza `.dark` en su subtree.

## Sección A — Estructura de tokens (dual light/dark)

En `src/lib/stylesVariables.ts`, la paleta `dash-*` pasa de valor plano a par light/dark con los valores de DESIGN.md:

| Token | Light | Dark |
|---|---|---|
| `dash-bg` | `#F7F5F0` | `#141414` |
| `dash-surface` | `#FFFFFF` | `#1D1C1A` |
| `dash-text` | `#141414` | `#F7F5F0` |
| `dash-muted` | `#5C5851` | `#9C9890` |
| `dash-border` | `#E4E0D8` | `#322F2A` |
| `dash-accent` | `#C87D4A` | `#C87D4A` (UI-only, 3:1, igual) |
| `dash-accent-text` | `#A85E2E` | `#D69466` (texto, 4.5:1) |
| `dash-success` | `#4A7C59` | `#4A7C59` |
| `dash-warning` | `#C89B3C` | `#C89B3C` |
| `dash-error` | `#B0473F` | `#B0473F` |
| `dash-info` | `#4A7290` | `#4A7290` |

- El generador `scripts/generate-theme-css.ts` (`pnpm generate:theme`) emite CSS custom properties: `:root` = valores light, `.dark { ... }` = override dark. Las clases Tailwind (`bg-dash-bg`, `text-dash-accent-text`, …) apuntan al CSS var → switchean solas.
- El test de consistencia (generador ↔ `globals.css`) se actualiza para el par light/dark; levanta tokens nuevos automáticamente (patrón ADR — nunca hand-editar el bloque generado de `globals.css`).
- **Contraste:** `dash-accent` es UI-only (3:1 suficiente); `dash-accent-text` es la variante de texto (4.5:1) — nunca usar `dash-accent` para texto/links. Verificar ambos en **light** (modo nuevo), no solo dark.

## Sección B — Mecanismo de theming (class-based)

- `.dark` en `<html>`. Tailwind 4 dark-mode class-based.
- **Default:** desde `prefers-color-scheme` vía un script inline chico en `<head>` (setea `.dark` antes del paint → evita FOUC).
- **Override del usuario:** un **toggle en la nav pública** (junto al switcher de idioma `ES·EN` ya existente), persistido en `localStorage`. Al montar, el toggle refleja el estado efectivo; al cambiar, escribe `localStorage` + flipea la clase.
- **Dashboards force-dark:** el `dash-shell` (staff) y el `client-shell` setean `.dark` en su subtree (o un contenedor `.dark` envolvente), así los dashboards/portal quedan siempre oscuros sin importar el modo del público. (El portal cliente ya era dark-only por decisión de 3a.)

## Sección C — No-breaking (strangler-fig)

4a es **puramente aditivo**:
- Agrega los tokens `dash-*` dual + el mecanismo de theming + el toggle.
- **La paleta `portfolioThemeColors` (Material) se queda** — las páginas públicas actuales siguen andando con Material, sin romperse.
- Los efectos de `getGlobalUiCss()` que referencian tokens Material (glass-card, signature-glow, hero-accent-text, text-glow, cyber-grid) **quedan intactos** en 4a (siguen sirviendo a las páginas no migradas).
- Cada página pública migra Material→`dash-*` en su sub-fase (4b/4c/4d).
- **Cleanup (4e):** una vez que ninguna página referencia Material ni los efectos cyan, se retiran `portfolioThemeColors` y los efectos de `getGlobalUiCss()`. Sin estado intermedio roto.

## Sección D — Alcance, no-alcance, verificación

**Alcance de 4a:** SOLO la fundación — cero restyle de páginas de contenido. Entregable:
- Tokens `dash-*` dual definidos + `globals.css` regenerado con `:root`/`.dark`.
- Toggle de tema en la nav pública + default por `prefers-color-scheme` + persistencia.
- `dash-shell` / `client-shell` forzando dark.
- Páginas públicas actuales **intactas y sin romperse** (todavía Material).

**Fuera de alcance de 4a:** restyle visual de home/sobre-mí/blog/foro (4b-4d); retiro de Material y efectos cyan (4e); el hero de 2 CTAs (4b).

**Verificación:**
- Test de consistencia de tokens verde; `pnpm generate:theme` regenera limpio; `tsc` + `npm test`.
- En vivo (preview): el toggle flipea light↔dark en una superficie de prueba; `prefers-color-scheme` respetado sin FOUC; contraste OK en ambos modos; **los dashboards (`/admin`, `/closer`, `/area-clientes`) permanecen dark** con el toggle en light.

## Prerrequisitos / notas
- No hand-editar el bloque generado de `globals.css` — editar `stylesVariables.ts` + `pnpm generate:theme`.
- Implementación en rama `fase-4a-token-foundation`, subagent-driven (mismo método que 3a), merge a main al verificar.
