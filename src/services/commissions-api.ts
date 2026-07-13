import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { CommissionEntryDTO } from "@/lib/types";
import { mapCommissionRow, type CommissionRow } from "@/services/commissions-calc";
import type { FetchResult } from "@/services/leads-api";

/**
 * Lista el ledger de comisiones. El alcance lo decide la RLS admin-only de
 * `commission_entries` (SELECT solo para admin) — un no-admin recibe 0 filas
 * sin error, igual que `listLeads` deja el filtrado a la base de datos.
 * Columnas enumeradas (no `select("*")`): el mapper depende de este shape exacto.
 */
export async function listCommissions(): Promise<FetchResult<CommissionEntryDTO[]>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("commission_entries")
    .select(
      "id, lead_id, closer_user_id, monto_base, comision_pct, commission_amount, estado, paid_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as CommissionRow[]).map(mapCommissionRow) };
}

/**
 * Marca una comisión `pending` como `paid`. La transición pending→paid y el
 * gate admin los aplica la RLS; acá no se duplica el chequeo de rol.
 *
 * `.select()` es obligatorio (P3-8): supabase-js NO expone el número de filas
 * afectadas sin él, así que un miss de RLS o de estado (ya pagada/revertida, o
 * no-admin) afecta 0 filas SIN devolver error. Sin el conteo devolveríamos un
 * falso éxito. `error` primero; luego 0 filas → "not-updatable".
 */
export async function markCommissionPaid(id: string): Promise<FetchResult<void>> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data, error } = await supabase
    .from("commission_entries")
    .update({ estado: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "pending")
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) return { ok: false, message: "not-updatable" };
  return { ok: true, data: undefined };
}
