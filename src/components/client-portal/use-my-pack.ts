"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientPackExtraDTO, PackExtraDTO } from "@/lib/types";
import { getMyProject, listAvailableExtras, listPack } from "@/services/clients-api";

type MyPackState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-client" }
  | { status: "ready"; clientId: string; extras: ClientPackExtraDTO[]; availableExtras: PackExtraDTO[] };

async function fetchMyPack(): Promise<MyPackState> {
  const projectResult = await getMyProject();
  if (!projectResult.ok) return { status: "error" };
  const client = projectResult.data;
  if (!client) return { status: "no-client" };

  const [packResult, availableResult] = await Promise.all([
    listPack(client.id),
    listAvailableExtras(client.id),
  ]);
  if (!packResult.ok) return { status: "error" };
  if (!availableResult.ok) return { status: "error" };

  return {
    status: "ready",
    clientId: client.id,
    extras: packResult.data,
    availableExtras: availableResult.data,
  };
}

/** Mismo patrón `reload`/`reloadKey` que `useLeadsData` — refetch tras `requestUpgrade`. */
export function useMyPack() {
  const [state, setState] = useState<MyPackState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchMyPack();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
