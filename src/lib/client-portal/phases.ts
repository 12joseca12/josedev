import type { ProjectPhase } from "@/lib/types";

/** Orden canónico de la barra de fases del portal cliente (DESIGN.md/Fase 3a). */
export const phaseOrder: readonly ProjectPhase[] = [
  "briefing",
  "diseño",
  "desarrollo",
  "revision",
  "entregado",
] as const;

const PHASE_LABELS: Record<ProjectPhase, string> = {
  briefing: "Briefing",
  diseño: "Diseño",
  desarrollo: "Desarrollo",
  revision: "Revisión",
  entregado: "Entregado",
};

/** Label legible para UI; devuelve el valor crudo si la fase no es reconocida. */
export function phaseLabel(phase: ProjectPhase): string {
  return PHASE_LABELS[phase] ?? phase;
}

/** Índice de `phase` en `phaseOrder`; -1 si no es una fase reconocida. */
export function phaseIndex(phase: ProjectPhase): number {
  return phaseOrder.indexOf(phase);
}
