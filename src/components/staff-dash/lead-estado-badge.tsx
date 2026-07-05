import { LEAD_ESTADO_TONE } from "@/lib/leads-kanban";
import type { LeadEstado, Locale } from "@/lib/types";
import { t } from "@/services/literals";

export const LEAD_ESTADO_LITERAL_KEY: Record<LeadEstado, string> = {
  nuevo: "staffLeads.estadoNuevo",
  contactado: "staffLeads.estadoContactado",
  negociando: "staffLeads.estadoNegociando",
  cerrado: "staffLeads.estadoCerrado",
  perdido: "staffLeads.estadoPerdido",
};

/**
 * Punto de color por tono. El color semántico va solo en el punto (elemento
 * no-texto, 3:1 alcanza) — el label queda en dash-text para no comprometer
 * el contraste 4.5:1 de texto pequeño sobre #141414 (DESIGN.md/Accesibilidad).
 */
const TONE_DOT_CLASS: Record<(typeof LEAD_ESTADO_TONE)[LeadEstado], string> = {
  info: "bg-dash-info",
  accent: "bg-dash-accent",
  warning: "bg-dash-warning",
  success: "bg-dash-success",
  error: "bg-dash-error",
};

type LeadEstadoBadgeProps = {
  estado: LeadEstado;
  locale: Locale;
};

export function LeadEstadoBadge({ estado, locale }: LeadEstadoBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-bg px-2 py-0.5">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${TONE_DOT_CLASS[LEAD_ESTADO_TONE[estado]]}`} />
      <span className="font-dash-mono text-[11px] font-medium uppercase tracking-wide text-dash-text">
        {t(locale, LEAD_ESTADO_LITERAL_KEY[estado])}
      </span>
    </span>
  );
}
