"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { LeadDTO, StaffMemberDTO } from "@/lib/types";
import { listLeads, listStaffMembers } from "@/services/leads-api";

type LeadsDataState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; leads: LeadDTO[]; staff: StaffMemberDTO[]; userId: string };

/** Carga paralela de todo lo que necesitan las vistas del CRM (leads bajo RLS + staff + sesión). */
async function fetchLeadsData(): Promise<LeadsDataState> {
  const supabase = getSupabaseSSRBrowserClient();
  const [leadsResult, staffResult, userResult] = await Promise.all([
    listLeads(),
    listStaffMembers(),
    supabase.auth.getUser(),
  ]);

  const userId = userResult.data.user?.id;
  if (!leadsResult.ok || !staffResult.ok || !userId) {
    return { status: "error" };
  }
  return { status: "ready", leads: leadsResult.data, staff: staffResult.data, userId };
}

/**
 * `reload` refetchea tras cada mutación — el pipeline es multi-usuario,
 * releer del server es la fuente de verdad (otro closer pudo reclamar o
 * mover un lead mientras tanto).
 */
export function useLeadsData() {
  const [state, setState] = useState<LeadsDataState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchLeadsData();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
