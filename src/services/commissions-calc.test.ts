import { mapCommissionRow, summarizeByCloser } from "./commissions-calc";
import type { CommissionEntryDTO } from "@/lib/types";

const entry = (over: Partial<CommissionEntryDTO>): CommissionEntryDTO => ({
  id: "e1", leadId: "l1", closerUserId: "c1", montoBase: 1000, comisionPct: 10,
  commissionAmount: 100, estado: "pending", paidAt: null, createdAt: "2026-07-12T00:00:00Z", ...over,
});

describe("commissions-calc", () => {
  it("maps a snake_case row to the DTO", () => {
    expect(mapCommissionRow({
      id: "e1", lead_id: "l1", closer_user_id: "c1", monto_base: 1000, comision_pct: 10,
      commission_amount: 100, estado: "pending", paid_at: null, created_at: "2026-07-12T00:00:00Z",
    })).toEqual(entry({}));
  });

  it("summarizes paid vs pending per closer, ignoring reversed", () => {
    const rows = [
      entry({ id: "a", closerUserId: "c1", commissionAmount: 100, estado: "paid" }),
      entry({ id: "b", closerUserId: "c1", commissionAmount: 50, estado: "pending" }),
      entry({ id: "c", closerUserId: "c1", commissionAmount: 999, estado: "reversed" }),
      entry({ id: "d", closerUserId: "c2", commissionAmount: 30, estado: "pending" }),
    ];
    const s = summarizeByCloser(rows);
    expect(s.get("c1")).toEqual({ paid: 100, pending: 50 });
    expect(s.get("c2")).toEqual({ paid: 0, pending: 30 });
  });
});
