import { DM_Sans, Geist, JetBrains_Mono } from "next/font/google";

/**
 * Tipografía DESIGN.md: JetBrains Mono para titulares/display, DM Sans para
 * UI/body, Geist (tabular-nums) para datos. Cargadas una vez aquí y
 * reutilizadas por el layout raíz público (`[locale]/layout.tsx`, Fase 4b)
 * y por los layouts de /admin, /closer y /area-clientes. globals.css mapea
 * estas variables a `--font-headline`/`--font-body` (público) y a
 * `--font-dash-mono`/`--font-dash-sans`/`--font-dash-data` (dashboards).
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const dashFontVariables = `${jetbrainsMono.variable} ${dmSans.variable} ${geist.variable}`;
