"use client";

import { useMemo, useState } from "react";

import { formatLeadMonto } from "@/lib/leads-kanban";
import type { CommissionEntryDTO, CommissionEstado, Locale } from "@/lib/types";
import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { useFinanzasData } from "@/components/staff-dash/use-finanzas-data";
import { summarizeByCloser } from "@/services/commissions-calc";
import { markCommissionPaid } from "@/services/commissions-api";
import { t } from "@/services/literals";

type Props = { locale: Locale };

const ESTADO_KEY: Record<CommissionEstado, string> = {
  pending: "finanzas.estadoPending",
  paid: "finanzas.estadoPaid",
  reversed: "finanzas.estadoReversed",
};

/** Punto de color por estado (no-texto, 3:1 alcanza; el label queda en dash-text). */
const ESTADO_DOT_CLASS: Record<CommissionEstado, string> = {
  pending: "bg-dash-warning",
  paid: "bg-dash-success",
  reversed: "bg-dash-border",
};

function CommissionEstadoBadge({ estado, locale }: { estado: CommissionEstado; locale: Locale }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-bg px-2 py-0.5">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${ESTADO_DOT_CLASS[estado]}`} />
      <span className="font-dash-mono text-[11px] font-medium uppercase tracking-wide text-dash-text">
        {t(locale, ESTADO_KEY[estado])}
      </span>
    </span>
  );
}

function formatFecha(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function FinanzasClient({ locale }: Props) {
  const { state, reload } = useFinanzasData();
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const closerEmailById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, string>();
    return new Map(state.staff.map((s) => [s.userId, s.email]));
  }, [state]);

  const leadLabelById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, string>();
    return new Map(state.leads.map((lead) => [lead.id, lead.fuente ?? `#${lead.id.slice(0, 8)}`]));
  }, [state]);

  const perCloser = useMemo(() => {
    if (state.status !== "ready") return [];
    const summary = summarizeByCloser(state.commissions);
    return state.staff
      .filter((s) => s.totalGanado !== 0 || summary.has(s.userId))
      .map((s) => {
        const sums = summary.get(s.userId) ?? { paid: 0, pending: 0 };
        return { userId: s.userId, email: s.email, earned: s.totalGanado, paid: sums.paid, pending: sums.pending };
      });
  }, [state]);

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "finanzas.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "finanzas.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "finanzas.retry")}
        </button>
      </div>
    );
  }

  const { commissions } = state;

  function closerLabel(entry: CommissionEntryDTO): string {
    return closerEmailById.get(entry.closerUserId) ?? entry.closerUserId;
  }

  function leadLabel(entry: CommissionEntryDTO): string {
    return leadLabelById.get(entry.leadId) ?? `#${entry.leadId.slice(0, 8)}`;
  }

  async function onMarkPaid(entry: CommissionEntryDTO) {
    setPendingId(entry.id);
    const result = await markCommissionPaid(entry.id);
    setPendingId(null);
    if (result.ok) {
      pushToast("success", t(locale, "finanzas.toastMarkPaidSuccess"));
      reload();
    } else {
      pushToast("error", t(locale, "finanzas.toastMarkPaidError"));
    }
  }

  return (
    <div className="max-w-6xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "finanzas.title")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "finanzas.subtitle")}</p>
      </header>

      {commissions.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "finanzas.empty")}</p>
      ) : (
        <>
          {/* Resumen por closer */}
          <section className="mb-8">
            <h2 className="mb-2 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
              {t(locale, "finanzas.perCloserTitle")}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-dash-border bg-dash-surface">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-dash-border">
                    {(["colCloser", "colGanado", "colPagado", "colPendiente"] as const).map((key) => (
                      <th
                        key={key}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2.5 font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
                      >
                        {t(locale, `finanzas.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-dash-data text-[13px]">
                  {perCloser.map((row) => (
                    <tr key={row.userId} className="border-b border-dash-border last:border-b-0">
                      <td className="max-w-64 truncate px-3 py-2 text-dash-text">{row.email}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-text">
                        {formatLeadMonto(row.earned, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-success">
                        {formatLeadMonto(row.paid, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-warning">
                        {formatLeadMonto(row.pending, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detalle por proyecto */}
          <section>
            <h2 className="mb-2 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
              {t(locale, "finanzas.perProjectTitle")}
            </h2>

            {/* Tabla desktop */}
            <div className="hidden overflow-x-auto rounded-xl border border-dash-border bg-dash-surface md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-dash-border">
                    {(["colProyecto", "colMonto", "colCloser", "colComision", "colEstado", "colAcciones"] as const).map(
                      (key) => (
                        <th
                          key={key}
                          scope="col"
                          className="whitespace-nowrap px-3 py-2.5 font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
                        >
                          {t(locale, `finanzas.${key}`)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="font-dash-data text-[13px]">
                  {commissions.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-dash-border last:border-b-0 ${
                        entry.estado === "reversed" ? "opacity-60" : ""
                      }`}
                    >
                      <td className="max-w-48 truncate px-3 py-2 text-dash-text">{leadLabel(entry)}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-muted">
                        {formatLeadMonto(entry.montoBase, locale)}
                      </td>
                      <td className="max-w-48 truncate px-3 py-2 text-dash-text">{closerLabel(entry)}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-text">
                        {formatLeadMonto(entry.commissionAmount, locale)}
                      </td>
                      <td className="px-3 py-2">
                        <CommissionEstadoBadge estado={entry.estado} locale={locale} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {entry.estado === "pending" ? (
                          <button
                            type="button"
                            disabled={pendingId === entry.id}
                            onClick={() => onMarkPaid(entry)}
                            aria-label={`${t(locale, "finanzas.markPaidAria")} ${leadLabel(entry)}`}
                            className="rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingId === entry.id
                              ? t(locale, "finanzas.markPaidPending")
                              : t(locale, "finanzas.markPaid")}
                          </button>
                        ) : entry.estado === "paid" && entry.paidAt ? (
                          <span className="text-[12px] text-dash-muted">
                            {t(locale, "finanzas.paidAtLabel")} {formatFecha(entry.paidAt, locale)}
                          </span>
                        ) : (
                          <span aria-hidden="true" className="text-dash-muted">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <ul className="space-y-3 md:hidden">
              {commissions.map((entry) => (
                <li
                  key={entry.id}
                  className={`rounded-xl border border-dash-border bg-dash-surface p-4 ${
                    entry.estado === "reversed" ? "opacity-60" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] font-medium text-dash-text">{leadLabel(entry)}</span>
                    <CommissionEstadoBadge estado={entry.estado} locale={locale} />
                  </div>
                  <p className="font-dash-data text-[13px] text-dash-muted">{closerLabel(entry)}</p>
                  <p className="mt-1 font-dash-data text-[13px] tabular-nums text-dash-text">
                    {formatLeadMonto(entry.commissionAmount, locale)}
                    <span className="text-dash-muted"> · {formatLeadMonto(entry.montoBase, locale)}</span>
                  </p>
                  {entry.estado === "pending" ? (
                    <button
                      type="button"
                      disabled={pendingId === entry.id}
                      onClick={() => onMarkPaid(entry)}
                      aria-label={`${t(locale, "finanzas.markPaidAria")} ${leadLabel(entry)}`}
                      className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-dash-border px-4 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingId === entry.id
                        ? t(locale, "finanzas.markPaidPending")
                        : t(locale, "finanzas.markPaid")}
                    </button>
                  ) : entry.estado === "paid" && entry.paidAt ? (
                    <p className="mt-2 text-[12px] text-dash-muted">
                      {t(locale, "finanzas.paidAtLabel")} {formatFecha(entry.paidAt, locale)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <DashToastViewport toasts={toasts} closeLabel={t(locale, "finanzas.closeToast")} onDismiss={dismissToast} />
    </div>
  );
}
