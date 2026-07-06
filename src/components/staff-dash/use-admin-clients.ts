"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientDTO, PackTemplateDTO } from "@/lib/types";
import { listClients, listPackTemplates } from "@/services/clients-api";

type AdminClientsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; clients: ClientDTO[]; packTemplates: PackTemplateDTO[] };

/** Trae clientes + catálogo de plantillas en paralelo — la tabla necesita el nombre del pack, no solo el id. */
async function fetchAdminClients(): Promise<AdminClientsState> {
  const [clientsResult, templatesResult] = await Promise.all([listClients(), listPackTemplates()]);
  if (!clientsResult.ok || !templatesResult.ok) return { status: "error" };
  return { status: "ready", clients: clientsResult.data, packTemplates: templatesResult.data };
}

/** Mismo patrón fetch-hook + `reloadKey` que `useLeadsData` (Fase 2). */
export function useAdminClients() {
  const [state, setState] = useState<AdminClientsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchAdminClients();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
