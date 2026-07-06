"use client";

import { phaseIndex, phaseLabel, phaseOrder } from "@/lib/client-portal/phases";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

import { useMyProject } from "./use-my-project";

type Props = { locale: Locale };

export function ProyectoClient({ locale }: Props) {
  const { state, reload } = useMyProject();

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

  const { client } = state;

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "clientPortal.proyectoH1")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.proyectoSubtitle")}</p>
      </header>

      {client === null ? (
        <div className="rounded-xl border border-dash-border bg-dash-surface p-5">
          <p className="text-[13px] font-medium text-dash-text">{t(locale, "clientPortal.noProjectTitle")}</p>
          <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.noProjectBody")}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
          {phaseOrder.map((phase, i) => {
            const current = phaseIndex(client.projectPhase);
            const isDone = current >= 0 && i < current;
            const isCurrent = i === current;
            const statusLabel = isDone
              ? t(locale, "clientPortal.phaseDone")
              : isCurrent
                ? t(locale, "clientPortal.phaseCurrent")
                : t(locale, "clientPortal.phasePending");

            return (
              <li
                key={phase}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex-1 rounded-xl border p-4 transition-colors md:rounded-none md:border-y md:border-l-0 md:first:rounded-l-xl md:first:border-l md:last:rounded-r-xl ${
                  isCurrent
                    ? "border-dash-accent bg-dash-bg"
                    : isDone
                      ? "border-dash-border bg-dash-surface"
                      : "border-dash-border bg-dash-surface opacity-50"
                }`}
              >
                <p
                  className={`font-dash-mono text-[10px] font-medium uppercase tracking-widest ${
                    isCurrent ? "text-dash-accent-text" : "text-dash-muted"
                  }`}
                >
                  {statusLabel}
                </p>
                <p className={`mt-1 text-[14px] font-semibold ${isDone ? "text-dash-muted" : "text-dash-text"}`}>
                  {phaseLabel(phase)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
