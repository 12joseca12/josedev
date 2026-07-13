"use client";

import { useCallback, useEffect, useState } from "react";

import type { CommissionEntryDTO, LeadDTO, StaffMemberDTO } from "@/lib/types";
import { listCommissions } from "@/services/commissions-api";
import { listLeads, listStaffMembers } from "@/services/leads-api";

type FinanzasState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      commissions: CommissionEntryDTO[];
      staff: StaffMemberDTO[];
      leads: LeadDTO[];
    };

/**
 * Trae el ledger de comisiones (RLS admin-only) + el staff (para nombre del
 * closer y `total_ganado`) + los leads (para etiqueta del proyecto) en
 * paralelo. Mismo patrón fetch-hook + `reloadKey` que `useAdminClients`; los
 * nombres se resuelven client-side (no join en la query) igual que en /admin/leads.
 */
async function fetchFinanzas(): Promise<FinanzasState> {
  const [commissionsResult, staffResult, leadsResult] = await Promise.all([
    listCommissions(),
    listStaffMembers(),
    listLeads(),
  ]);
  if (!commissionsResult.ok || !staffResult.ok || !leadsResult.ok) return { status: "error" };
  return {
    status: "ready",
    commissions: commissionsResult.data,
    staff: staffResult.data,
    leads: leadsResult.data,
  };
}

export function useFinanzasData() {
  const [state, setState] = useState<FinanzasState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const next = await fetchFinanzas();
      if (mounted) setState(next);
    })();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return { state, reload };
}
