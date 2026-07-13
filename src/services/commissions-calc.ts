import type { CommissionEntryDTO, CommissionEstado } from "@/lib/types";

export type CommissionRow = {
  id: string;
  lead_id: string;
  closer_user_id: string;
  monto_base: number;
  comision_pct: number;
  commission_amount: number;
  estado: CommissionEstado;
  paid_at: string | null;
  created_at: string;
};

export function mapCommissionRow(row: CommissionRow): CommissionEntryDTO {
  return {
    id: row.id,
    leadId: row.lead_id,
    closerUserId: row.closer_user_id,
    montoBase: row.monto_base,
    comisionPct: row.comision_pct,
    commissionAmount: row.commission_amount,
    estado: row.estado,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

/** Suma pagado/pendiente por closer. 'reversed' se ignora (no cuenta como deuda ni pago).
 *  Acumula en CENTAVOS enteros para evitar drift de float (0.1+0.2) y reconciliar exacto. */
export function summarizeByCloser(
  entries: CommissionEntryDTO[],
): Map<string, { paid: number; pending: number }> {
  const cents = new Map<string, { paid: number; pending: number }>();
  for (const e of entries) {
    if (e.estado === "reversed") continue;
    const acc = cents.get(e.closerUserId) ?? { paid: 0, pending: 0 };
    const c = Math.round(e.commissionAmount * 100);
    if (e.estado === "paid") acc.paid += c;
    else acc.pending += c;
    cents.set(e.closerUserId, acc);
  }
  const out = new Map<string, { paid: number; pending: number }>();
  for (const [k, v] of cents) out.set(k, { paid: v.paid / 100, pending: v.pending / 100 });
  return out;
}
