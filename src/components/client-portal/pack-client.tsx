"use client";

import { useState } from "react";

import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import type { ClientPackExtraEstado, Locale, PackExtraDTO } from "@/lib/types";
import { requestUpgrade } from "@/services/clients-api";
import { t } from "@/services/literals";

import { useMyPack } from "./use-my-pack";

type Props = { locale: Locale };

const ESTADO_LITERAL_KEY: Record<ClientPackExtraEstado, string> = {
  incluido: "clientPortal.packExtraEstadoIncluido",
  solicitado: "clientPortal.packExtraEstadoSolicitado",
  activo: "clientPortal.packExtraEstadoActivo",
  rechazado: "clientPortal.packExtraEstadoRechazado",
};

const ESTADO_TONE_CLASS: Record<ClientPackExtraEstado, string> = {
  incluido: "border-dash-border text-dash-muted",
  solicitado: "border-dash-warning text-dash-warning",
  activo: "border-dash-success text-dash-success",
  rechazado: "border-dash-error text-dash-error",
};

function PackExtraBadge({ estado, locale }: { estado: ClientPackExtraEstado; locale: Locale }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-dash-mono text-[10px] font-medium uppercase tracking-wide ${ESTADO_TONE_CLASS[estado]}`}
    >
      {t(locale, ESTADO_LITERAL_KEY[estado])}
    </span>
  );
}

function AvailableExtraRow({
  extra,
  locale,
  isBusy,
  onRequest,
}: {
  extra: PackExtraDTO;
  locale: Locale;
  isBusy: boolean;
  onRequest: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-dash-border bg-dash-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[14px] font-semibold text-dash-text">{extra.nombre}</p>
        {extra.precio != null ? (
          <p className="mt-0.5 font-dash-data text-[13px] tabular-nums text-dash-muted">
            {new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
              style: "currency",
              currency: "EUR",
            }).format(extra.precio)}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={isBusy}
        onClick={onRequest}
        className="min-h-11 rounded-lg border border-dash-border px-4 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
      >
        {isBusy ? t(locale, "clientPortal.requestingUpgrade") : t(locale, "clientPortal.requestExtra")}
      </button>
    </li>
  );
}

export function PackClient({ locale }: Props) {
  const { state, reload } = useMyPack();
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [busyExtraId, setBusyExtraId] = useState<string | null>(null);

  async function onRequestUpgrade(clientId: string, packExtraId: string) {
    setBusyExtraId(packExtraId);
    const result = await requestUpgrade(clientId, packExtraId);
    setBusyExtraId(null);
    if (result.ok) {
      pushToast("success", t(locale, "clientPortal.toastUpgradeRequested"));
      reload();
    } else {
      pushToast("error", t(locale, "clientPortal.actionError"));
    }
  }

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "clientPortal.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "clientPortal.retry")}
        </button>
      </div>
    );
  }

  if (state.status === "no-client") {
    return (
      <div className="rounded-xl border border-dash-border bg-dash-surface p-5">
        <p className="text-[13px] font-medium text-dash-text">{t(locale, "clientPortal.noProjectTitle")}</p>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.noProjectBody")}</p>
      </div>
    );
  }

  const { extras, availableExtras } = state;

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "clientPortal.packH1")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.packSubtitle")}</p>
      </header>

      {extras.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.emptyPack")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {extras.map((extra) => {
            const canRequest = extra.estado === "rechazado";
            const isBusy = busyExtraId === extra.id;
            return (
              <li
                key={extra.id}
                className="flex flex-col gap-3 rounded-xl border border-dash-border bg-dash-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[14px] font-semibold text-dash-text">
                    {extra.packExtra?.nombre ?? extra.packExtraId}
                  </p>
                  {extra.packExtra?.precio != null ? (
                    <p className="mt-0.5 font-dash-data text-[13px] tabular-nums text-dash-muted">
                      {new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
                        style: "currency",
                        currency: "EUR",
                      }).format(extra.packExtra.precio)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <PackExtraBadge estado={extra.estado} locale={locale} />
                  {extra.estado === "incluido" ? null : (
                    <button
                      type="button"
                      disabled={!canRequest || isBusy}
                      onClick={() => void onRequestUpgrade(state.clientId, extra.packExtraId)}
                      className="min-h-11 rounded-lg border border-dash-border px-4 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                    >
                      {isBusy ? t(locale, "clientPortal.requestingUpgrade") : t(locale, "clientPortal.requestUpgrade")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-8">
        <header className="mb-3">
          <h2 className="font-dash-mono text-[15px] font-bold text-dash-text">
            {t(locale, "clientPortal.availableExtrasTitle")}
          </h2>
          <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.availableExtrasSubtitle")}</p>
        </header>

        {availableExtras.length === 0 ? (
          <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.emptyAvailableExtras")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {availableExtras.map((extra) => (
              <AvailableExtraRow
                key={extra.id}
                extra={extra}
                locale={locale}
                isBusy={busyExtraId === extra.id}
                onRequest={() => void onRequestUpgrade(state.clientId, extra.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <DashToastViewport toasts={toasts} closeLabel={t(locale, "clientPortal.closeDialog")} onDismiss={dismissToast} />
    </div>
  );
}
