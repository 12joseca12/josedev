"use client";

import { SOBRE_MI_TECH_ICON_MAP } from "@/lib/sobre-mi-tech-icon-map";
import type { SobreMiTechKey } from "@/lib/types";

type Props = {
  tech: SobreMiTechKey;
  className?: string;
  sizeClass?: string;
};

export function SobreMiTechIcon({ tech, className = "", sizeClass = "size-8" }: Props) {
  const { Icon, brandColor } = SOBRE_MI_TECH_ICON_MAP[tech];
  const style = brandColor ? { color: brandColor } : undefined;
  return <Icon className={`${sizeClass} shrink-0 ${className}`.trim()} style={style} aria-hidden />;
}
