import type { SobreMiCategoryConfig, SobreMiCategoryKey } from "@/lib/types";

/** Orden y composición de cada bloque del portfolio (sin texto de UI). */
export const SOBRE_MI_CATEGORY_ORDER: readonly SobreMiCategoryKey[] = [
  "mobile",
  "web",
  "backend",
  "quality",
] as const;

export const SOBRE_MI_CATEGORY_CONFIG: Record<SobreMiCategoryKey, SobreMiCategoryConfig> = {
  mobile: {
    primary: "reactNative",
    primaryBadges: ["react", "androidStudio", "xcode"],
    items: ["expo", "androidStudio", "xcode", "deepLinking", "pushNotifications", "appDeployment"],
  },
  web: {
    primary: "nextjs",
    primaryBadges: ["react", "nextjs", "vercel"],
    items: ["typescript", "tailwind", "html5", "css3", "accessibility"],
  },
  backend: {
    primary: "nodejs",
    primaryBadges: ["nodejs", "nestjs"],
    items: ["apis", "supabase", "firebase", "postgresql", "mongodb", "redis"],
  },
  quality: {
    primary: "jest",
    primaryBadges: ["jest"],
    items: ["redux", "git", "github", "agile", "jira", "itil"],
  },
};
