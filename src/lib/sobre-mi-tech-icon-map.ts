import {
  Accessibility,
  Bell,
  BookOpen,
  Link2,
  Network,
  RefreshCw,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiAndroid,
  SiApple,
  SiCss,
  SiExpo,
  SiFirebase,
  SiGit,
  SiGithub,
  SiHtml5,
  SiJest,
  SiJira,
  SiMongodb,
  SiNestjs,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiReact,
  SiRedis,
  SiRedux,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
} from "react-icons/si";

import type { SobreMiTechKey } from "@/lib/types";

export type SobreMiTechIconEntry = {
  Icon: IconType | LucideIcon;
  brandColor?: string;
};

/**
 * Mapeo icono ↔ tecnología (Simple Icons + Lucide para conceptos genéricos).
 */
export const SOBRE_MI_TECH_ICON_MAP: Record<SobreMiTechKey, SobreMiTechIconEntry> = {
  reactNative: { Icon: SiReact, brandColor: "#61DAFB" },
  expo: { Icon: SiExpo },
  androidStudio: { Icon: SiAndroid, brandColor: "#3DDC84" },
  xcode: { Icon: SiApple },
  deepLinking: { Icon: Link2 },
  pushNotifications: { Icon: Bell },
  appDeployment: { Icon: Rocket },
  react: { Icon: SiReact, brandColor: "#61DAFB" },
  nextjs: { Icon: SiNextdotjs },
  vercel: { Icon: SiVercel },
  typescript: { Icon: SiTypescript, brandColor: "#3178C6" },
  tailwind: { Icon: SiTailwindcss, brandColor: "#06B6D4" },
  html5: { Icon: SiHtml5, brandColor: "#E34F26" },
  css3: { Icon: SiCss, brandColor: "#1572B6" },
  accessibility: { Icon: Accessibility },
  nodejs: { Icon: SiNodedotjs, brandColor: "#339933" },
  nestjs: { Icon: SiNestjs, brandColor: "#E0234E" },
  apis: { Icon: Network },
  supabase: { Icon: SiSupabase, brandColor: "#3FCF8E" },
  firebase: { Icon: SiFirebase, brandColor: "#FFCA28" },
  postgresql: { Icon: SiPostgresql, brandColor: "#4169E1" },
  mongodb: { Icon: SiMongodb, brandColor: "#47A248" },
  redis: { Icon: SiRedis, brandColor: "#DC382D" },
  jest: { Icon: SiJest, brandColor: "#C21325" },
  redux: { Icon: SiRedux, brandColor: "#764ABC" },
  git: { Icon: SiGit, brandColor: "#F05032" },
  github: { Icon: SiGithub },
  agile: { Icon: RefreshCw },
  jira: { Icon: SiJira, brandColor: "#0052CC" },
  itil: { Icon: BookOpen },
};
