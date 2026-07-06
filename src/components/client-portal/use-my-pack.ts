"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientPackExtraDTO } from "@/lib/types";
import { getMyProject, listPack } from "@/services/clients-api";

type MyPackState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-client" }
  | { status: "ready"; clientId: string; extras: ClientPackExtraDTO[] };

async function fetchMyPack(): Promise<MyPackState> {
  const projectResult = await getMyProject();
  if (!projectResult.ok) return { status: "error" };
  const client = projectResult.data;
  if (!client) return { status: "no-client" };

  const packResult = await listPack(client.id);
  if (!packResult.ok) return { status: "error" };

  return { status: "ready", clientId: client.id, extras: packResult.data };
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
