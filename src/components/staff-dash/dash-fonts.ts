import { DM_Sans, Geist, JetBrains_Mono } from "next/font/google";

/**
 * Tipografía del dashboard staff (DESIGN.md): JetBrains Mono para titulares,
 * DM Sans para UI, Geist (tabular-nums) para datos. Se cargan solo en los
 * layouts de /admin y /closer — el sitio público sigue con Space Grotesk/Inter
 * hasta la Fase 4. globals.css mapea estas variables a font-dash-*.
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
