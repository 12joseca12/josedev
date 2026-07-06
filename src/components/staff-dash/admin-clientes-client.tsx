"use client";

import { useMemo } from "react";
import Link from "next/link";

import { phaseLabel } from "@/lib/client-portal/phases";
import type { ClientDTO, Locale } from "@/lib/types";
import { useAdminClients } from "@/components/staff-dash/use-admin-clients";
import { t } from "@/services/literals";

type Props = { locale: Locale };

function formatFecha(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AdminClientesClient({ locale }: Props) {
  const { state, reload } = useAdminClients();

  const packNameById = useMemo(() => {
    if (state.status !== "ready") return new Map<string, string>();
    return new Map(state.packTemplates.map((template) => [template.id, template.nombre]));
  }, [state]);

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "adminClientes.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "adminClientes.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "adminClientes.retry")}
        </button>
      </div>
    );
  }

  const { clients } = state;

  function packLabel(client: ClientDTO): string {
    if (!client.packTemplateId) return "—";
    return packNameById.get(client.packTemplateId) ?? client.packTemplateId;
  }

  function accessLabel(client: ClientDTO): string {
    return client.userId ? t(locale, "adminClientes.accessYes") : t(locale, "adminClientes.accessNo");
  }

  return (
    <div className="max-w-6xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "adminClientes.title")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "adminClientes.subtitle")}</p>
      </header>

      {clients.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "adminClientes.empty")}</p>
      ) : (
        <>
          {/* Tabla compacta (densidad de dashboard, Geist tabular para datos) — mismo idioma que /admin/leads */}
          <div className="hidden overflow-x-auto rounded-xl border border-dash-border bg-dash-surface md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-dash-border">
                  {(["colFecha", "colPack", "colFase", "colAcceso", "colAcciones"] as const).map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2.5 font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted"
                    >
                      {t(locale, `adminClientes.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-dash-data text-[13px]">
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-dash-border last:border-b-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-dash-muted">
                      {formatFecha(client.createdAt, locale)}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-dash-text">{packLabel(client)}</td>
                    <td className="px-3 py-2 text-dash-text">{phaseLabel(client.projectPhase)}</td>
                    <td className="px-3 py-2 text-dash-text">{accessLabel(client)}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/${locale}/admin/clientes/${client.id}`}
                        className="rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                      >
                        {t(locale, "adminClientes.manageLink")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards apiladas bajo md (DESIGN.md: tabla de 4+ columnas no va en mobile) */}
          <ul className="space-y-3 md:hidden">
            {clients.map((client) => (
              <li key={client.id} className="rounded-xl border border-dash-border bg-dash-surface p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-dash-text">{phaseLabel(client.projectPhase)}</span>
                  <span className="font-dash-data text-[13px] tabular-nums text-dash-muted">
                    {formatFecha(client.createdAt, locale)}
                  </span>
                </div>
                <p className="text-[13px] text-dash-text">{packLabel(client)}</p>
                <p className="mt-1 text-[13px] text-dash-muted">{accessLabel(client)}</p>
                <Link
                  href={`/${locale}/admin/clientes/${client.id}`}
                  className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-dash-border px-4 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                >
                  {t(locale, "adminClientes.manageLink")}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
