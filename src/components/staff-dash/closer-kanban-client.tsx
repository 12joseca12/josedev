"use client";

import { useMemo, useState, type FormEvent } from "react";

import { DashModal } from "@/components/staff-dash/dash-modal";
import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { LEAD_ESTADO_LITERAL_KEY, LeadEstadoBadge } from "@/components/staff-dash/lead-estado-badge";
import { useLeadsData } from "@/components/staff-dash/use-leads-data";
import {
  LEAD_ESTADOS,
  formatLeadFecha,
  formatLeadMonto,
  groupLeadsByEstado,
  isRevertFromCerrado,
  splitPoolAndOwn,
} from "@/lib/leads-kanban";
import type { LeadDTO, LeadEstado, Locale } from "@/lib/types";
import { claimLead, takeLeadFromAnotherCloser, updateLeadEstado } from "@/services/leads-api";
import { t } from "@/services/literals";

type Props = { locale: Locale };

type ModalState =
  | { kind: "close"; lead: LeadDTO; montoInput: string; invalid: boolean }
  | { kind: "revert"; lead: LeadDTO; target: LeadEstado }
  | { kind: "take"; idInput: string }
  | null;

const COLUMN_DOT_CLASS: Record<LeadEstado, string> = {
  nuevo: "bg-dash-info",
  contactado: "bg-dash-accent",
  negociando: "bg-dash-warning",
  cerrado: "bg-dash-success",
  perdido: "bg-dash-error",
};

const secondaryButtonClass =
  "rounded-lg border border-dash-border px-3 py-2 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

const primaryButtonClass =
  "rounded-lg bg-dash-accent px-3 py-2 text-[13px] font-medium text-dash-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50";

export function CloserKanbanClient({ locale }: Props) {
  const { state, reload } = useLeadsData();
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const board = useMemo(() => {
    if (state.status !== "ready") return null;
    const { own, pool } = splitPoolAndOwn(state.leads, state.userId);
    return { groups: groupLeadsByEstado(own), pool, ownCount: own.length };
  }, [state]);

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "staffLeads.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "staffLeads.loadError")}</p>
        <button type="button" onClick={reload} className={`mt-2 ${secondaryButtonClass}`}>
          {t(locale, "staffLeads.retry")}
        </button>
      </div>
    );
  }

  const me = state.staff.find((member) => member.userId === state.userId);

  async function runAction(action: () => Promise<{ ok: boolean; toastOk: string; toastFail: string }>) {
    setBusy(true);
    const { ok, toastOk, toastFail } = await action();
    setBusy(false);
    pushToast(ok ? "success" : "error", ok ? toastOk : toastFail);
    setModal(null);
    reload();
  }

  async function onClaim(lead: LeadDTO) {
    await runAction(async () => {
      const result = await claimLead(lead.id);
      return {
        ok: result.ok,
        toastOk: t(locale, "staffLeads.claimSuccess"),
        toastFail: t(
          locale,
          !result.ok && result.reason === "already-claimed"
            ? "staffLeads.claimAlreadyClaimed"
            : "staffLeads.actionError",
        ),
      };
    });
  }

  function requestMove(lead: LeadDTO, target: LeadEstado) {
    if (target === lead.estado) return;
    if (isRevertFromCerrado(lead.estado, target)) {
      setModal({ kind: "revert", lead, target });
      return;
    }
    if (target === "cerrado") {
      setModal({ kind: "close", lead, montoInput: lead.monto !== null ? String(lead.monto) : "", invalid: false });
      return;
    }
    void doMove(lead, target);
  }

  async function doMove(lead: LeadDTO, target: LeadEstado, monto?: number) {
    await runAction(async () => {
      const result = await updateLeadEstado(lead.id, target, monto);
      return {
        ok: result.ok,
        toastOk: t(locale, "staffLeads.toastEstadoChanged"),
        toastFail: result.ok ? "" : `${t(locale, "staffLeads.actionError")} ${result.message}`,
      };
    });
  }

  function onSubmitClose(event: FormEvent) {
    event.preventDefault();
    if (modal?.kind !== "close") return;
    const monto = Number.parseFloat(modal.montoInput.replace(",", "."));
    if (!Number.isFinite(monto) || monto <= 0) {
      setModal({ ...modal, invalid: true });
      return;
    }
    void doMove(modal.lead, "cerrado", monto);
  }

  function onSubmitTake(event: FormEvent) {
    event.preventDefault();
    if (modal?.kind !== "take") return;
    const leadId = modal.idInput.trim();
    if (!leadId) return;
    void runAction(async () => {
      const result = await takeLeadFromAnotherCloser(leadId);
      return {
        ok: result.ok,
        toastOk: t(locale, "staffLeads.takeSuccess"),
        toastFail: t(locale, "staffLeads.takeError"),
      };
    });
  }

  async function onCopyId(lead: LeadDTO) {
    try {
      await navigator.clipboard.writeText(lead.id);
      pushToast("success", t(locale, "staffLeads.copiedId"));
    } catch {
      pushToast("error", t(locale, "staffLeads.actionError"));
    }
  }

  function leadCard(lead: LeadDTO) {
    const moveSelectId = `move-${lead.id}`;
    return (
      <li key={lead.id} className="rounded-xl border border-dash-border bg-dash-surface p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-dash-text">
            {lead.fuente ?? "—"}
          </span>
          <span className="shrink-0 font-dash-data text-[11px] tabular-nums text-dash-muted">
            {formatLeadFecha(lead.createdAt, locale)}
          </span>
        </div>
        {lead.monto !== null ? (
          <p className="font-dash-data text-[13px] tabular-nums text-dash-text">
            {formatLeadMonto(lead.monto, locale)}
          </p>
        ) : null}
        {lead.notas ? <p className="mt-1 line-clamp-2 text-xs text-dash-muted">{lead.notas}</p> : null}
        <div
          role="group"
          aria-label={t(locale, "staffLeads.ariaLeadActions")}
          className="mt-2.5 flex items-center gap-1.5"
        >
          <label htmlFor={moveSelectId} className="sr-only">
            {t(locale, "staffLeads.moveTo")}
          </label>
          <select
            id={moveSelectId}
            value={lead.estado}
            disabled={busy}
            onChange={(event) => requestMove(lead, event.target.value as LeadEstado)}
            className="min-h-9 w-full min-w-0 flex-1 rounded-lg border border-dash-border bg-dash-bg px-2 py-1.5 text-xs text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50"
          >
            {LEAD_ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {t(locale, LEAD_ESTADO_LITERAL_KEY[estado])}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void onCopyId(lead)}
            aria-label={t(locale, "staffLeads.copyId")}
            title={t(locale, "staffLeads.copyId")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dash-border font-dash-mono text-[11px] text-dash-muted transition-colors hover:border-dash-accent hover:text-dash-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          >
            <span aria-hidden="true">#</span>
          </button>
        </div>
      </li>
    );
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-dash-mono text-xl font-bold text-dash-text">
            {t(locale, "staffLeads.closerTitle")}
          </h1>
          {me ? (
            <dl className="mt-2 flex gap-6">
              <div>
                <dt className="font-dash-mono text-[10px] uppercase tracking-widest text-dash-muted">
                  {t(locale, "staffLeads.totalGanadoLabel")}
                </dt>
                <dd className="font-dash-data text-base font-medium tabular-nums text-dash-accent-text">
                  {formatLeadMonto(me.totalGanado, locale)}
                </dd>
              </div>
              {me.comision !== null ? (
                <div>
                  <dt className="font-dash-mono text-[10px] uppercase tracking-widest text-dash-muted">
                    {t(locale, "staffLeads.comisionRateLabel")}
                  </dt>
                  <dd className="font-dash-data text-base font-medium tabular-nums text-dash-text">
                    {me.comision}%
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setModal({ kind: "take", idInput: "" })}
          className={secondaryButtonClass}
        >
          {t(locale, "staffLeads.takeByIdButton")}
        </button>
      </header>

      <section aria-label={t(locale, "staffLeads.ariaPool")} className="mb-6">
        <h2 className="mb-2 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
          {t(locale, "staffLeads.poolTitle")}
          <span className="ml-1.5 font-dash-data tabular-nums">({board?.pool.length ?? 0})</span>
        </h2>
        {board && board.pool.length > 0 ? (
          <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
            {board.pool.map((lead) => (
              <li
                key={lead.id}
                className="w-64 shrink-0 snap-start rounded-xl border border-dash-border bg-dash-surface p-3"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-dash-text">
                    {lead.fuente ?? "—"}
                  </span>
                  <span className="shrink-0 font-dash-data text-[11px] tabular-nums text-dash-muted">
                    {formatLeadFecha(lead.createdAt, locale)}
                  </span>
                </div>
                {lead.notas ? (
                  <p className="mb-2.5 line-clamp-2 text-xs text-dash-muted">{lead.notas}</p>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onClaim(lead)}
                  className={`${primaryButtonClass} min-h-9 w-full`}
                >
                  {t(locale, "staffLeads.claimButton")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-dash-muted">{t(locale, "staffLeads.poolEmpty")}</p>
        )}
      </section>

      <section aria-label={t(locale, "staffLeads.ariaKanban")}>
        {board && board.ownCount === 0 ? (
          <p className="mb-4 text-[13px] text-dash-muted">{t(locale, "staffLeads.boardEmpty")}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {LEAD_ESTADOS.map((estado) => {
            const column = board?.groups[estado] ?? [];
            return (
              <section
                key={estado}
                aria-label={t(locale, LEAD_ESTADO_LITERAL_KEY[estado])}
                className="rounded-xl border border-dash-border bg-dash-bg"
              >
                <h2 className="flex items-center gap-2 border-b border-dash-border px-3 py-2.5 font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-text">
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${COLUMN_DOT_CLASS[estado]}`}
                  />
                  {t(locale, LEAD_ESTADO_LITERAL_KEY[estado])}
                  <span className="ml-auto font-dash-data tabular-nums text-dash-muted">
                    {column.length}
                  </span>
                </h2>
                <ul className="min-h-16 space-y-2 p-2">{column.map((lead) => leadCard(lead))}</ul>
              </section>
            );
          })}
        </div>
      </section>

      {modal?.kind === "close" ? (
        <DashModal
          title={t(locale, "staffLeads.closeModalTitle")}
          closeLabel={t(locale, "staffLeads.closeDialog")}
          onClose={() => setModal(null)}
        >
          <form onSubmit={onSubmitClose}>
            <p className="mb-4 text-[13px] text-dash-muted">{t(locale, "staffLeads.closeModalHelp")}</p>
            <label
              htmlFor="close-monto"
              className="mb-1.5 block font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
            >
              {t(locale, "staffLeads.montoLabel")}
            </label>
            <input
              id="close-monto"
              type="text"
              inputMode="decimal"
              required
              autoComplete="off"
              spellCheck={false}
              value={modal.montoInput}
              onChange={(event) => setModal({ ...modal, montoInput: event.target.value, invalid: false })}
              aria-invalid={modal.invalid || undefined}
              className="w-full rounded-lg border border-dash-border bg-dash-bg px-3 py-2.5 font-dash-data text-sm tabular-nums text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
            />
            {modal.invalid ? (
              <p role="alert" className="mt-1.5 text-xs text-dash-error">
                {t(locale, "staffLeads.montoInvalid")}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className={secondaryButtonClass}>
                {t(locale, "staffLeads.cancel")}
              </button>
              <button type="submit" disabled={busy} className={primaryButtonClass}>
                {t(locale, "staffLeads.closeSubmit")}
              </button>
            </div>
          </form>
        </DashModal>
      ) : null}

      {modal?.kind === "revert" ? (
        <DashModal
          title={t(locale, "staffLeads.revertModalTitle")}
          closeLabel={t(locale, "staffLeads.closeDialog")}
          onClose={() => setModal(null)}
        >
          <p className="mb-2 text-[13px] text-dash-muted">{t(locale, "staffLeads.revertModalBody")}</p>
          <p className="mb-5 flex items-center gap-2 text-[13px] text-dash-text">
            <LeadEstadoBadge estado="cerrado" locale={locale} />
            <span aria-hidden="true">→</span>
            <LeadEstadoBadge estado={modal.target} locale={locale} />
          </p>
          <div className="flex justify-end gap-2">
            {/* Foco inicial en cancelar: la confirmación revierte un movimiento financiero */}
            <button
              type="button"
              data-modal-action
              onClick={() => setModal(null)}
              className={secondaryButtonClass}
            >
              {t(locale, "staffLeads.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void doMove(modal.lead, modal.target)}
              className="rounded-lg bg-dash-error px-3 py-2 text-[13px] font-medium text-dash-text transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:opacity-50"
            >
              {t(locale, "staffLeads.revertConfirm")}
            </button>
          </div>
        </DashModal>
      ) : null}

      {modal?.kind === "take" ? (
        <DashModal
          title={t(locale, "staffLeads.takeByIdTitle")}
          closeLabel={t(locale, "staffLeads.closeDialog")}
          onClose={() => setModal(null)}
        >
          <form onSubmit={onSubmitTake}>
            <p className="mb-4 text-[13px] text-dash-muted">{t(locale, "staffLeads.takeByIdHelp")}</p>
            <label
              htmlFor="take-lead-id"
              className="mb-1.5 block font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
            >
              {t(locale, "staffLeads.takeByIdPlaceholder")}
            </label>
            <input
              id="take-lead-id"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              value={modal.idInput}
              onChange={(event) => setModal({ ...modal, idInput: event.target.value })}
              placeholder={t(locale, "staffLeads.takeByIdPlaceholder")}
              className="w-full rounded-lg border border-dash-border bg-dash-bg px-3 py-2.5 font-dash-mono text-sm text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className={secondaryButtonClass}>
                {t(locale, "staffLeads.cancel")}
              </button>
              <button type="submit" disabled={busy} className={primaryButtonClass}>
                {t(locale, "staffLeads.takeByIdSubmit")}
              </button>
            </div>
          </form>
        </DashModal>
      ) : null}

      <DashToastViewport
        toasts={toasts}
        closeLabel={t(locale, "staffLeads.closeDialog")}
        onDismiss={dismissToast}
      />
    </div>
  );
}
