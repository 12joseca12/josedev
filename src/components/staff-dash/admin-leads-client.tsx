"use client";

import { useMemo, useState } from "react";

import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { LEAD_ESTADO_LITERAL_KEY, LeadEstadoBadge } from "@/components/staff-dash/lead-estado-badge";
import { useLeadsData } from "@/components/staff-dash/use-leads-data";
import { LEAD_ESTADOS, formatLeadFecha, formatLeadMonto } from "@/lib/leads-kanban";
import type { LeadDTO, LeadEstado, Locale, StaffMemberDTO } from "@/lib/types";
import { reassignLead } from "@/services/leads-api";
import { t } from "@/services/literals";

type Props = { locale: Locale };

type EstadoFilter = "all" | LeadEstado;

const UNASSIGNED_VALUE = "__pool__";

function fieldSelectClass(extra = "") {
  return `rounded-lg border border-dash-border bg-dash-bg px-2 py-1.5 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent ${extra}`;
}

export function AdminLeadsClient({ locale }: Props) {
  const { state, reload } = useLeadsData();
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [filter, setFilter] = useState<EstadoFilter>("all");
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  const staffById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, StaffMemberDTO>();
    return new Map(state.staff.map((member) => [member.userId, member]));
  }, [state]);

  async function onReassign(lead: LeadDTO, rawValue: string) {
    const target = rawValue === UNASSIGNED_VALUE ? null : rawValue;
    if (target === lead.assignedStaffId) return;
    setBusyLeadId(lead.id);
    const result = await reassignLead(lead.id, target);
    setBusyLeadId(null);
    if (result.ok) {
      pushToast("success", t(locale, "staffLeads.toastReassigned"));
    } else {
      pushToast("error", t(locale, "staffLeads.actionError"));
    }
    reload();
  }

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "staffLeads.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "staffLeads.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "staffLeads.retry")}
        </button>
      </div>
    );
  }

  const { leads, staff } = state;
  const unassignedCount = leads.filter((lead) => lead.assignedStaffId === null).length;
  const visibleLeads = filter === "all" ? leads : leads.filter((lead) => lead.estado === filter);

  const filterOptions: { value: EstadoFilter; label: string }[] = [
    { value: "all", label: t(locale, "staffLeads.filterAll") },
    ...LEAD_ESTADOS.map((estado) => ({
      value: estado as EstadoFilter,
      label: t(locale, LEAD_ESTADO_LITERAL_KEY[estado]),
    })),
  ];

  function assigneeSelect(lead: LeadDTO, idPrefix: string) {
    const selectId = `${idPrefix}-${lead.id}`;
    return (
      <>
        <label htmlFor={selectId} className="sr-only">
          {t(locale, "staffLeads.reassignLabel")}
        </label>
        <select
          id={selectId}
          value={lead.assignedStaffId ?? UNASSIGNED_VALUE}
          disabled={busyLeadId === lead.id}
          onChange={(event) => void onReassign(lead, event.target.value)}
          className={fieldSelectClass("w-full min-w-40 max-w-52 disabled:opacity-50")}
        >
          <option value={UNASSIGNED_VALUE}>{t(locale, "staffLeads.unassignedOption")}</option>
          {lead.assignedStaffId && !staffById.has(lead.assignedStaffId) ? (
            <option value={lead.assignedStaffId}>{lead.assignedStaffId}</option>
          ) : null}
          {staff.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.email}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <div className="max-w-6xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">
          {t(locale, "staffLeads.adminTitle")}
        </h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "staffLeads.adminSubtitle")}</p>
      </header>

      {unassignedCount > 0 ? (
        <div role="status" className="mb-4 border-l-4 border-dash-warning bg-dash-surface px-4 py-2.5">
          <p className="text-[13px] text-dash-text">
            {t(locale, "staffLeads.unassignedAlert").replace("{count}", String(unassignedCount))}
          </p>
        </div>
      ) : null}

      <div role="group" aria-label={t(locale, "staffLeads.colEstado")} className="mb-4 flex flex-wrap gap-1.5">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-lg border px-3 py-1.5 font-dash-mono text-[11px] font-medium uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent ${
              filter === option.value
                ? "border-dash-accent bg-dash-accent text-dash-bg"
                : "border-dash-border text-dash-muted hover:text-dash-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleLeads.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "staffLeads.emptyLeads")}</p>
      ) : (
        <>
          {/* Tabla compacta (densidad de dashboard, Geist tabular para datos) */}
          <div className="hidden overflow-x-auto rounded-xl border border-dash-border bg-dash-surface md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-dash-border">
                  {(["colFecha", "colFuente", "colEstado", "colMonto", "colAsignado", "colNotas"] as const).map(
                    (key) => (
                      <th
                        key={key}
                        scope="col"
                        className={`whitespace-nowrap px-3 py-2.5 font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted ${
                          key === "colMonto" ? "text-right" : ""
                        }`}
                      >
                        {t(locale, `staffLeads.${key}`)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="font-dash-data text-[13px]">
                {visibleLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-dash-border last:border-b-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-muted">
                      {formatLeadFecha(lead.createdAt, locale)}
                    </td>
                    <td className="max-w-40 truncate px-3 py-2 text-dash-text">{lead.fuente ?? "—"}</td>
                    <td className="px-3 py-2">
                      <LeadEstadoBadge estado={lead.estado} locale={locale} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-dash-text">
                      {formatLeadMonto(lead.monto, locale)}
                    </td>
                    <td className="px-3 py-2">{assigneeSelect(lead, "assignee-row")}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-dash-muted">{lead.notas ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards apiladas bajo md (DESIGN.md: una tabla de 4+ columnas no va en mobile) */}
          <ul className="space-y-3 md:hidden">
            {visibleLeads.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-dash-border bg-dash-surface p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <LeadEstadoBadge estado={lead.estado} locale={locale} />
                  <span className="font-dash-data text-[13px] tabular-nums text-dash-muted">
                    {formatLeadFecha(lead.createdAt, locale)}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-dash-text">{lead.fuente ?? "—"}</p>
                <p className="mt-0.5 font-dash-data text-[13px] tabular-nums text-dash-text">
                  {formatLeadMonto(lead.monto, locale)}
                </p>
                {lead.notas ? (
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-dash-muted">{lead.notas}</p>
                ) : null}
                <div className="mt-3">{assigneeSelect(lead, "assignee-card")}</div>
                {lead.assignedStaffId && !staffById.has(lead.assignedStaffId) ? (
                  <p className="mt-1 text-[11px] text-dash-muted">{lead.assignedStaffId}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <DashToastViewport
        toasts={toasts}
        closeLabel={t(locale, "staffLeads.closeDialog")}
        onDismiss={dismissToast}
      />
    </div>
  );
}
