"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientAssetDTO } from "@/lib/types";
import { getMyProject } from "@/services/clients-api";
import { listAssets } from "@/services/assets-api";

type MyAssetsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "no-client" }
  | { status: "ready"; clientId: string; assets: ClientAssetDTO[] };

async function fetchMyAssets(): Promise<MyAssetsState> {
  const projectResult = await getMyProject();
  if (!projectResult.ok) return { status: "error" };
  const client = projectResult.data;
  if (!client) return { status: "no-client" };
  const assetsResult = await listAssets(client.id);
  if (!assetsResult.ok) return { status: "error" };
  return { status: "ready", clientId: client.id, assets: assetsResult.data };
}

/** Mismo patrón `reload`/`reloadKey` que `useMyTasks`. */
export function useMyAssets() {
  const [state, setState] = useState<MyAssetsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchMyAssets();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);
  return { state, reload };
}
