import { SOBRE_MI_CATEGORY_CONFIG, SOBRE_MI_CATEGORY_ORDER } from "./sobre-mi-stack-config";
import { SOBRE_MI_TECH_ICON_MAP } from "./sobre-mi-tech-icon-map";
import type { SobreMiTechKey } from "./types";

function allTechKeys(): SobreMiTechKey[] {
  const keys = new Set<SobreMiTechKey>();
  for (const category of SOBRE_MI_CATEGORY_ORDER) {
    const cfg = SOBRE_MI_CATEGORY_CONFIG[category];
    keys.add(cfg.primary);
    for (const k of cfg.items) keys.add(k);
    for (const k of cfg.primaryBadges) keys.add(k);
  }
  return [...keys];
}

describe("sobre-mi-stack-config", () => {
  it("every configured tech has an icon", () => {
    for (const tech of allTechKeys()) {
      expect(SOBRE_MI_TECH_ICON_MAP[tech]).toBeTruthy();
    }
  });

  it("has four categories in design order", () => {
    expect(SOBRE_MI_CATEGORY_ORDER).toEqual(["mobile", "web", "backend", "quality"]);
  });
});
