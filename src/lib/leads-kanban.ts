import type { LeadDTO, LeadEstado } from "@/lib/types";

/** Orden canónico de columnas del kanban (pipeline de venta, DESIGN.md/ADR Capa 2). */
export const LEAD_ESTADOS: readonly LeadEstado[] = [
  "nuevo",
  "contactado",
  "negociando",
  "cerrado",
  "perdido",
] as const;

/**
 * Tono semántico por estado — mapea a los tokens dash-* de stylesVariables.ts
 * (accent se reserva para acciones; los estados usan la paleta semántica).
 */
export const LEAD_ESTADO_TONE: Record<LeadEstado, "info" | "warning" | "success" | "error" | "accent"> = {
  nuevo: "info",
  contactado: "accent",
  negociando: "warning",
  cerrado: "success",
  perdido: "error",
};

/** Más recientes primero; empate estable por id para render determinista. */
export function sortLeadsByCreatedDesc(leads: readonly LeadDTO[]): LeadDTO[] {
  return leads.toSorted((a, b) => {
    const byDate = b.createdAt.localeCompare(a.createdAt);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

export function groupLeadsByEstado(leads: readonly LeadDTO[]): Record<LeadEstado, LeadDTO[]> {
  const groups: Record<LeadEstado, LeadDTO[]> = {
    nuevo: [],
    contactado: [],
    negociando: [],
    cerrado: [],
    perdido: [],
  };
  for (const lead of sortLeadsByCreatedDesc(leads)) {
    groups[lead.estado].push(lead);
  }
  return groups;
}

/**
 * Separa lo que ve un closer bajo RLS: su tablero (asignados a él) y el pool
 * sin asignar (reclamable). Leads de terceros no llegan nunca (los filtra la
 * policy de SELECT), pero filtrar acá igual mantiene el contrato explícito.
 */
export function splitPoolAndOwn(
  leads: readonly LeadDTO[],
  userId: string,
): { own: LeadDTO[]; pool: LeadDTO[] } {
  const own: LeadDTO[] = [];
  const pool: LeadDTO[] = [];
  for (const lead of leads) {
    if (lead.assignedStaffId === userId) own.push(lead);
    else if (lead.assignedStaffId === null) pool.push(lead);
  }
  return { own, pool };
}

/**
 * Reglas de transición que la UI debe mediar con modal (espejan el trigger
 * financiero de la DB — la validación real vive allá, esto solo decide UX):
 * cerrar exige monto; salir de 'cerrado' revierte comisión (confirmación).
 */
export function closingRequiresMonto(from: LeadEstado, to: LeadEstado, monto: number | null): boolean {
  return to === "cerrado" && from !== "cerrado" && monto === null;
}

export function isRevertFromCerrado(from: LeadEstado, to: LeadEstado): boolean {
  return from === "cerrado" && to !== "cerrado";
}

const EUR_FORMATTERS: Record<string, Intl.NumberFormat> = {};

/** Monto en EUR con locale del sitio; null → em-dash (columna tabular, Geist). */
export function formatLeadMonto(monto: number | null, locale: "es" | "en"): string {
  if (monto === null) return "—";
  const intlLocale = locale === "es" ? "es-ES" : "en-IE";
  EUR_FORMATTERS[intlLocale] ??= new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "EUR",
  });
  return EUR_FORMATTERS[intlLocale].format(monto);
}

const DATE_FORMATTERS: Record<string, Intl.DateTimeFormat> = {};

export function formatLeadFecha(iso: string, locale: "es" | "en"): string {
  const intlLocale = locale === "es" ? "es-ES" : "en-GB";
  DATE_FORMATTERS[intlLocale] ??= new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "short",
  });
  return DATE_FORMATTERS[intlLocale].format(new Date(iso));
}
