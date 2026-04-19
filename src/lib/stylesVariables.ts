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
} as const satisfies Record<string, string>;

export const styleTokens = {
  color: portfolioThemeColors,

  radius: {
    DEFAULT: "0.125rem",
    lg: "0.25rem",
    xl: "0.5rem",
    /** Design uses 0.75rem for “full” pills in the mock */
    full: "0.75rem",
  },

  layout: {
    maxContentWidth: "90rem",
    navShadow: "0 10px 30px rgba(0, 229, 255, 0.03)",
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

/**
 * Injects `--color-*` for every portfolio token so Tailwind utilities (`bg-background`, `text-on-surface`, …) resolve at runtime.
 */
export function getPortfolioThemeCss(): string {
  const lines = (
    Object.entries(portfolioThemeColors) as [string, string][]
  ).map(([key, value]) => `  --color-${key}: ${value};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

/** Extra non-token utilities (glass, gradients, Material icon tuning). */
export function getGlobalUiCss(): string {
  return `
.glass-card {
  background: rgba(30, 32, 35, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
/* Botones / superficies: gradiente como fondo completo (no mezclar con texto) */
.signature-glow {
  background-image: linear-gradient(135deg, #c3f5ff 0%, #00e5ff 100%);
  background-size: 100% 100%;
}
/* Título hero: el texto lleva el gradiente (evita el “bloque sólido” sin glifos) */
.hero-accent-text {
  display: block;
  background-image: linear-gradient(135deg, #c3f5ff 0%, #00e5ff 55%, #45fec9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  /* refuerzo legible en navegadores que clipan mal */
  paint-order: stroke fill;
}
.text-glow {
  text-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
}
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.grid-overlay {
  background-image:
    linear-gradient(to right, rgba(132, 147, 150, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(132, 147, 150, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

.auth-cyber-grid {
  background-image:
    linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px);
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
  stroke: rgba(0, 229, 255, 0.32);
  stroke-width: 1.1;
  stroke-dasharray: 5 16;
  stroke-linecap: round;
  animation: auth-circuit-dash 8s linear infinite;
}

.auth-circuit-path--mint {
  fill: none;
  stroke: rgba(69, 254, 201, 0.22);
  stroke-width: 1;
  stroke-dasharray: 9 18;
  stroke-linecap: round;
  animation: auth-circuit-dash 12s linear infinite reverse;
}

.auth-circuit-node {
  fill: rgba(0, 229, 255, 0.55);
  animation: auth-circuit-breathe 3.4s ease-in-out infinite;
}

.auth-circuit-node--delayed {
  fill: rgba(161, 255, 220, 0.45);
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
  background: rgba(26, 28, 31, 0.92);
  border: 1px solid rgba(59, 73, 76, 0.55);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 28px rgba(0, 229, 255, 0.12);
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
  background: rgba(26, 28, 31, 0.92);
  border-left: 1px solid rgba(59, 73, 76, 0.55);
  border-top: 1px solid rgba(59, 73, 76, 0.55);
}

[data-hover-label]:hover::after,
[data-hover-label]:hover::before,
[data-hover-label]:focus-visible::after,
[data-hover-label]:focus-visible::before {
  opacity: 1;
  transform: translate(-50%, -10px) scale(1);
}
`;
}

/**
 * Extra CSS for `layout.tsx` `<style />` (glass, gradients).
 * Color tokens live in `globals.css` `@theme inline` (kept in sync with `portfolioThemeColors`).
 */
export function getRootStyleBlockCss(): string {
  return getGlobalUiCss();
}
