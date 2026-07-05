import {
  LEAD_ESTADOS,
  closingRequiresMonto,
  formatLeadMonto,
  groupLeadsByEstado,
  isRevertFromCerrado,
  sortLeadsByCreatedDesc,
  splitPoolAndOwn,
} from "./leads-kanban";
import type { LeadDTO } from "./types";

function lead(overrides: Partial<LeadDTO> & Pick<LeadDTO, "id">): LeadDTO {
  return {
    conversationId: null,
    assignedStaffId: null,
    estado: "nuevo",
    fuente: null,
    monto: null,
    notas: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("LEAD_ESTADOS", () => {
  it("keeps the pipeline order used by the kanban columns", () => {
    expect(LEAD_ESTADOS).toEqual(["nuevo", "contactado", "negociando", "cerrado", "perdido"]);
  });
});

describe("sortLeadsByCreatedDesc", () => {
  it("orders most recent first without mutating the input", () => {
    const input = [
      lead({ id: "a", createdAt: "2026-07-01T10:00:00.000Z" }),
      lead({ id: "b", createdAt: "2026-07-03T10:00:00.000Z" }),
      lead({ id: "c", createdAt: "2026-07-02T10:00:00.000Z" }),
    ];
    const sorted = sortLeadsByCreatedDesc(input);
    expect(sorted.map((l) => l.id)).toEqual(["b", "c", "a"]);
    expect(input.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks created_at ties by id for deterministic rendering", () => {
    const input = [lead({ id: "z" }), lead({ id: "a" })];
    expect(sortLeadsByCreatedDesc(input).map((l) => l.id)).toEqual(["a", "z"]);
  });
});

describe("groupLeadsByEstado", () => {
  it("returns every estado bucket even when empty", () => {
    const groups = groupLeadsByEstado([]);
    for (const estado of LEAD_ESTADOS) {
      expect(groups[estado]).toEqual([]);
    }
  });

  it("groups leads under their estado, sorted desc within each column", () => {
    const groups = groupLeadsByEstado([
      lead({ id: "old-nuevo", estado: "nuevo", createdAt: "2026-07-01T10:00:00.000Z" }),
      lead({ id: "new-nuevo", estado: "nuevo", createdAt: "2026-07-04T10:00:00.000Z" }),
      lead({ id: "solo-cerrado", estado: "cerrado", monto: 1000 }),
    ]);
    expect(groups.nuevo.map((l) => l.id)).toEqual(["new-nuevo", "old-nuevo"]);
    expect(groups.cerrado.map((l) => l.id)).toEqual(["solo-cerrado"]);
    expect(groups.perdido).toEqual([]);
  });
});

describe("splitPoolAndOwn", () => {
  it("splits own leads from the unassigned pool and drops third-party leads", () => {
    const { own, pool } = splitPoolAndOwn(
      [
        lead({ id: "mine", assignedStaffId: "me" }),
        lead({ id: "pool-1", assignedStaffId: null }),
        lead({ id: "other", assignedStaffId: "someone-else" }),
      ],
      "me",
    );
    expect(own.map((l) => l.id)).toEqual(["mine"]);
    expect(pool.map((l) => l.id)).toEqual(["pool-1"]);
  });
});

describe("closingRequiresMonto", () => {
  it("requires monto when moving into cerrado without one", () => {
    expect(closingRequiresMonto("negociando", "cerrado", null)).toBe(true);
  });

  it("does not prompt when monto is already set or target is not cerrado", () => {
    expect(closingRequiresMonto("negociando", "cerrado", 1500)).toBe(false);
    expect(closingRequiresMonto("nuevo", "contactado", null)).toBe(false);
  });
});

describe("isRevertFromCerrado", () => {
  it("flags transitions out of cerrado (commission reversal confirmation)", () => {
    expect(isRevertFromCerrado("cerrado", "negociando")).toBe(true);
    expect(isRevertFromCerrado("cerrado", "cerrado")).toBe(false);
    expect(isRevertFromCerrado("nuevo", "perdido")).toBe(false);
  });
});

describe("formatLeadMonto", () => {
  it("renders EUR for both locales and em-dash for null", () => {
    expect(formatLeadMonto(null, "es")).toBe("—");
    expect(formatLeadMonto(1500, "es")).toContain("€");
    expect(formatLeadMonto(1500, "en")).toContain("€");
  });
});
