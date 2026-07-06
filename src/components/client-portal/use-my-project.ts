"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClientDTO } from "@/lib/types";
import { getMyProject } from "@/services/clients-api";

type MyProjectState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; client: ClientDTO | null };

async function fetchMyProject(): Promise<MyProjectState> {
  const result = await getMyProject();
  if (!result.ok) return { status: "error" };
  return { status: "ready", client: result.data };
}

/** `reload` refetchea tras cualquier mutación futura — mismo patrón que `useLeadsData`. */
export function useMyProject() {
  const [state, setState] = useState<MyProjectState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchMyProject();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
