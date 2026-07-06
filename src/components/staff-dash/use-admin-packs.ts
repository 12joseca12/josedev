"use client";

import { useCallback, useEffect, useState } from "react";

import type { PackExtraDTO, PackTemplateDTO } from "@/lib/types";
import { listPackExtras, listPackTemplates } from "@/services/clients-api";

type AdminPacksState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; templates: PackTemplateDTO[]; extras: PackExtraDTO[] };

async function fetchAdminPacks(): Promise<AdminPacksState> {
  const [templatesResult, extrasResult] = await Promise.all([listPackTemplates(), listPackExtras()]);
  if (!templatesResult.ok || !extrasResult.ok) return { status: "error" };
  return { status: "ready", templates: templatesResult.data, extras: extrasResult.data };
}

/** Mismo patrón fetch-hook + `reloadKey` que `useLeadsData`/`useAdminClients`. */
export function useAdminPacks() {
  const [state, setState] = useState<AdminPacksState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchAdminPacks();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
