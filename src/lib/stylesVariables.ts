/**
 * Design tokens: portfolio / editorial dark theme (Stitch export).
 * Import from `@/lib/stylesVariables` only; do not duplicate hex values in components.
 */

/** Material-style semantic palette (dark UI). Keys match Tailwind theme names (kebab-case). */
export const portfolioThemeColors = {
  background: "#111316",
  surface: "#111316",
  "inverse-on-surface": "#2f3034",
  "on-surface": "#e2e2e6",
  "primary-container": "#00e5ff",
  outline: "#849396",
  "on-tertiary-fixed": "#002117",
  "tertiary-fixed": "#45fec9",
  "outline-variant": "#3b494c",
  "on-secondary": "#002d6e",
  "surface-dim": "#111316",
  "on-secondary-fixed-variant": "#00429b",
  "surface-container-highest": "#333538",
  "error-container": "#93000a",
  "inverse-primary": "#006875",
  "on-secondary-fixed": "#001945",
  "secondary-fixed-dim": "#b0c6ff",
  "on-tertiary": "#003829",
  "on-secondary-container": "#f2f3ff",
  primary: "#c3f5ff",
  "surface-container-lowest": "#0c0e11",
  "on-tertiary-fixed-variant": "#00513d",
  "primary-fixed-dim": "#00daf3",
  "primary-fixed": "#9cf0ff",
  "tertiary-container": "#23ebb8",
  "surface-container-high": "#282a2d",
  tertiary: "#a1ffdc",
  "secondary-container": "#0068ed",
  "surface-container": "#1e2023",
  "on-tertiary-container": "#00654d",
  "secondary-fixed": "#d9e2ff",
  "on-primary-container": "#00626e",
  "surface-variant": "#333538",
  "surface-tint": "#00daf3",
  "surface-container-low": "#1a1c1f",
  "on-primary-fixed": "#001f24",
  "tertiary-fixed-dim": "#00e1ae",
  "on-background": "#e2e2e6",
  "on-primary": "#00363d",
  error: "#ffb4ab",
  "on-error": "#690005",
  secondary: "#b0c6ff",
  "inverse-surface": "#e2e2e6",
  "on-surface-variant": "#bac9cc",
  "on-primary-fixed-variant": "#004f58",
  "surface-bright": "#37393d",
  "on-error-container": "#ffdad6",

  // Chrome/mockup colors (macOS traffic lights, terminal/device/preview surfaces).
  // Not part of the semantic Material palette above — literal brand/hardware colors
  // used only by the terminal and device-mockup components.
  "mac-close": "#ff5f57",
  "mac-close-icon": "#4a0f0c",
  "mac-minimize": "#febc2e",
  "mac-minimize-icon": "#5a4a0a",
  "mac-maximize": "#28c840",
  "mac-maximize-icon": "#0a4a14",
  "terminal-panel": "#0a0e12",
  "terminal-footer": "#06090c",
  "hero-terminal-surface": "#08090c",
  "app-preview-surface": "#0c1014",
  "app-preview-accent": "#00b8a8",
  "app-preview-surface-deep": "#041412",
  "app-preview-surface-dim": "#080a0d",
  "device-frame-bezel": "#050608",
  "forum-composer-surface": "#06080a",

  // Dashboard staff (DESIGN.md, dark mode) — admin/closer/portal. Namespace `dash-`
  // hasta la Fase 4 (rediseño del sitio público), que promoverá esta paleta a
  // tokens globales y retirará la Material de arriba. `dash-accent` es solo para
  // UI grande (3:1); `dash-accent-text` es la variante 4.5:1 para texto/links.
  "dash-bg": "#141414",
  "dash-surface": "#1d1c1a",
  "dash-text": "#f7f5f0",
  "dash-muted": "#9c9890",
  "dash-border": "#322f2a",
  "dash-accent": "#c87d4a",
  "dash-accent-text": "#d69466",
  "dash-success": "#4a7c59",
  "dash-warning": "#c89b3c",
  "dash-error": "#b0473f",
  "dash-info": "#4a7290",
} as const satisfies Record<string, string>;

/** Stacking-order tokens. Values may repeat across names — the name documents *why*, the generator/@theme block is the single place the number lives. */
export const zIndexTokens = {
  "scroll-progress": 60,
  "forum-modal-overlay": 60,
  "skip-link": 100,
  "mobile-menu-overlay": 200,
  "chat-widget": 220,
} as const satisfies Record<string, number>;

/** Converts a `#rrggbb` token value to an `rgba(...)` string at the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const styleTokens = {
  color: portfolioThemeColors,
  zIndex: zIndexTokens,

  radius: {
    DEFAULT: "0.125rem",
    lg: "0.25rem",
    xl: "0.5rem",
    /** Design uses 0.75rem for “full” pills in the mock */
    full: "0.75rem",
  },

  layout: {
    maxContentWidth: "90rem",
    navShadow: `0 10px 30px ${withAlpha(portfolioThemeColors["primary-container"], 0.03)}`,
  },

  motion: {
    duration: {
      fast: "150ms",
      normal: "200ms",
      slow: "300ms",
    },
  },
} as const;

export type StyleTokens = typeof styleTokens;

/** Extra non-token utilities (glass, gradients, Material icon tuning). */
export function getGlobalUiCss(): string {
  const primaryContainer = portfolioThemeColors["primary-container"];
  const tertiaryFixed = portfolioThemeColors["tertiary-fixed"];
  const tertiary = portfolioThemeColors.tertiary;
  const primary = portfolioThemeColors.primary;
  const outline = portfolioThemeColors.outline;
  const outlineVariant = portfolioThemeColors["outline-variant"];
  const surfaceContainer = portfolioThemeColors["surface-container"];
  const surfaceContainerLow = portfolioThemeColors["surface-container-low"];

  return `
.glass-card {
  background: ${withAlpha(surfaceContainer, 0.4)};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
/* Botones / superficies: gradiente como fondo completo (no mezclar con texto) */
.signature-glow {
  background-image: linear-gradient(135deg, ${primary} 0%, ${primaryContainer} 100%);
  background-size: 100% 100%;
}
/* Título hero: el texto lleva el gradiente (evita el “bloque sólido” sin glifos) */
.hero-accent-text {
  display: block;
  background-image: linear-gradient(135deg, ${primary} 0%, ${primaryContainer} 55%, ${tertiaryFixed} 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  /* refuerzo legible en navegadores que clipan mal */
  paint-order: stroke fill;
}
.text-glow {
  text-shadow: 0 0 20px ${withAlpha(primaryContainer, 0.3)};
}
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.grid-overlay {
  background-image:
    linear-gradient(to right, ${withAlpha(outline, 0.05)} 1px, transparent 1px),
    linear-gradient(to bottom, ${withAlpha(outline, 0.05)} 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Chat terminal: ocultar scrollbar nativa (refuerzo junto a globals.css). */
.terminal-chat-scroll {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.terminal-chat-scroll::-webkit-scrollbar,
.terminal-chat-scroll::-webkit-scrollbar-thumb,
.terminal-chat-scroll::-webkit-scrollbar-track,
.terminal-chat-scroll::-webkit-scrollbar-corner {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
  background: transparent !important;
}

.auth-cyber-grid {
  background-image:
    linear-gradient(${withAlpha(primaryContainer, 0.05)} 1px, transparent 1px),
    linear-gradient(90deg, ${withAlpha(primaryContainer, 0.05)} 1px, transparent 1px);
  background-size: 40px 40px;
}

@keyframes auth-circuit-dash {
  to {
    stroke-dashoffset: -320;
  }
}

@keyframes auth-circuit-breathe {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.15);
  }
}

.auth-circuit-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.auth-circuit-path--cyan {
  fill: none;
  stroke: ${withAlpha(primaryContainer, 0.32)};
  stroke-width: 1.1;
  stroke-dasharray: 5 16;
  stroke-linecap: round;
  animation: auth-circuit-dash 8s linear infinite;
}

.auth-circuit-path--mint {
  fill: none;
  stroke: ${withAlpha(tertiaryFixed, 0.22)};
  stroke-width: 1;
  stroke-dasharray: 9 18;
  stroke-linecap: round;
  animation: auth-circuit-dash 12s linear infinite reverse;
}

.auth-circuit-node {
  fill: ${withAlpha(primaryContainer, 0.55)};
  animation: auth-circuit-breathe 3.4s ease-in-out infinite;
}

.auth-circuit-node--delayed {
  fill: ${withAlpha(tertiary, 0.45)};
  animation: auth-circuit-breathe 3.4s ease-in-out infinite;
  animation-delay: 1.1s;
}

@media (prefers-reduced-motion: reduce) {
  .auth-circuit-path--cyan,
  .auth-circuit-path--mint,
  .auth-circuit-node,
  .auth-circuit-node--delayed {
    animation: none !important;
  }
}

/*
  Hover labels (tooltips) for clickable elements.
  Use: add 'data-hover-label="..."' to <a>, <button>, etc.
  Optional: data-hover-label-placement="below" (default: above).
  Shows on hover AND keyboard focus (focus-visible).
*/
[data-hover-label] {
  position: relative;
}

[data-hover-label]::after,
[data-hover-label]::before {
  position: absolute;
  left: 50%;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -6px) scale(0.98);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
  z-index: 80;
}

[data-hover-label]::after {
  content: attr(data-hover-label);
  top: -10px;
  translate: 0 -100%;
  max-width: min(320px, calc(100vw - 2rem));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 12px;
  padding: 8px 10px;
  font: 600 12px/1.2 var(--font-headline, ui-sans-serif);
  color: var(--color-on-surface);
  background: ${withAlpha(surfaceContainerLow, 0.92)};
  border: 1px solid ${withAlpha(outlineVariant, 0.55)};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 28px ${withAlpha(primaryContainer, 0.12)};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

[data-hover-label]::before {
  content: "";
  top: -10px;
  translate: 0 -2px;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -6px) rotate(45deg);
  background: ${withAlpha(surfaceContainerLow, 0.92)};
  border-left: 1px solid ${withAlpha(outlineVariant, 0.55)};
  border-top: 1px solid ${withAlpha(outlineVariant, 0.55)};
}

[data-hover-label]:hover::after,
[data-hover-label]:hover::before,
[data-hover-label]:focus-visible::after,
[data-hover-label]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, -10px) scale(1);
}

[data-hover-label][data-hover-label-placement="below"]::after,
[data-hover-label][data-hover-label-placement="below"]::before {
  top: auto;
  bottom: -10px;
  transform: translate(-50%, 6px) scale(0.98);
}

[data-hover-label][data-hover-label-placement="below"]::after {
  translate: 0 100%;
}

[data-hover-label][data-hover-label-placement="below"]::before {
  translate: 0 2px;
  border-left: none;
  border-top: none;
  border-right: 1px solid ${withAlpha(outlineVariant, 0.55)};
  border-bottom: 1px solid ${withAlpha(outlineVariant, 0.55)};
}

[data-hover-label][data-hover-label-placement="below"]:hover::after,
[data-hover-label][data-hover-label-placement="below"]:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 10px) scale(1);
}

[data-hover-label][data-hover-label-placement="below"]:hover::before,
[data-hover-label][data-hover-label-placement="below"]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, 10px) rotate(45deg) scale(1);
}
`;
}

/**
 * Extra CSS for `layout.tsx` `<style />` (glass, gradients).
 * Color tokens live in `globals.css` `@theme inline`, generated from
 * `portfolioThemeColors` by `scripts/generate-theme-css.ts` (`pnpm generate:theme`).
 */
export function getRootStyleBlockCss(): string {
  return getGlobalUiCss();
}
