import { claimLead, listLeads, listStaffMembers, reassignLead, takeLeadFromAnotherCloser, updateLeadEstado } from "./leads-api";

type QueryResult = { data: unknown; error: unknown };

/**
 * Query builder falso: cada método de encadenado (eq/is/select/order/update)
 * devuelve el mismo objeto, y el objeto es "thenable" — se resuelve al
 * `result` configurado sin importar en qué eslabón de la cadena el código
 * bajo test deje de encadenar. Así imita el comportamiento real de
 * supabase-js (cada paso de la query es awaitable por sí solo).
 */
function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    eq: () => builder,
    is: () => builder,
    select: () => builder,
    order: () => builder,
    update: () => builder,
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  return builder;
}

function makeMockSupabase(opts: {
  userId?: string | null;
  fromResult: QueryResult;
}) {
  const { userId = "closer-1", fromResult } = opts;
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    from: () => makeQueryBuilder(fromResult),
  };
}

const mockGetClient = jest.fn();

jest.mock("../lib/supabase/ssr-browser-client", () => ({
  getSupabaseSSRBrowserClient: () => mockGetClient(),
}));

beforeEach(() => {
  mockGetClient.mockReset();
});

describe("claimLead", () => {
  it("returns error if there is no authenticated user", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ userId: null, fromResult: { data: null, error: null } }));
    await expect(claimLead("lead-1")).resolves.toEqual({ ok: false, reason: "error" });
  });

  it("returns ok when exactly one row is claimed", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [{ id: "lead-1" }], error: null } }));
    await expect(claimLead("lead-1")).resolves.toEqual({ ok: true });
  });

  it("returns already-claimed when another closer won the race (0 rows affected)", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [], error: null } }));
    await expect(claimLead("lead-1")).resolves.toEqual({ ok: false, reason: "already-claimed" });
  });

  it("returns error when the query itself fails", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: new Error("network") } }),
    );
    await expect(claimLead("lead-1")).resolves.toEqual({ ok: false, reason: "error" });
  });
});

describe("takeLeadFromAnotherCloser", () => {
  it("returns ok when the transfer succeeds", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [{ id: "lead-1" }], error: null } }));
    await expect(takeLeadFromAnotherCloser("lead-1")).resolves.toEqual({ ok: true });
  });

  it("returns already-claimed if the lead no longer matches (e.g. deleted concurrently)", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [], error: null } }));
    await expect(takeLeadFromAnotherCloser("lead-1")).resolves.toEqual({
      ok: false,
      reason: "already-claimed",
    });
  });
});

describe("updateLeadEstado", () => {
  it("returns ok on success", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: null, error: null } }));
    await expect(updateLeadEstado("lead-1", "contactado")).resolves.toEqual({ ok: true });
  });

  it("propagates the DB error message when closing without an amount (financial-integrity trigger)", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: null,
          error: { message: "No se puede marcar un lead como cerrado sin monto cargado (lead lead-1)" },
        },
      }),
    );
    const result = await updateLeadEstado("lead-1", "cerrado");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/sin monto cargado/);
  });

  it("propagates the DB error message when editing the amount of an already-closed lead", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: null,
          error: { message: "No se puede editar el monto de un lead ya cerrado (lead lead-1) — revertí el cierre primero" },
        },
      }),
    );
    const result = await updateLeadEstado("lead-1", "cerrado", 2000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/revertí el cierre primero/);
  });

  it("includes monto in the update payload only when provided", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "closer-1" } } }) },
      from: () => ({
        update: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await updateLeadEstado("lead-1", "cerrado", 1500);
    expect(capturedPayload).toEqual({ estado: "cerrado", monto: 1500 });
  });
});

describe("reassignLead", () => {
  it("returns ok when the admin reassigns successfully", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [{ id: "lead-1" }], error: null } }));
    await expect(reassignLead("lead-1", "closer-2")).resolves.toEqual({ ok: true });
  });

  it("returns ok when returning a lead to the unassigned pool (null)", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [{ id: "lead-1" }], error: null } }));
    await expect(reassignLead("lead-1", null)).resolves.toEqual({ ok: true });
  });

  it("surfaces a not-found message when RLS silently blocks a non-admin's attempt", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: [], error: null } }));
    await expect(reassignLead("lead-1", "closer-2")).resolves.toEqual({ ok: false, message: "not-found" });
  });

  it("propagates a genuine query error", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: { message: "permission denied" } } }),
    );
    await expect(reassignLead("lead-1", "closer-2")).resolves.toEqual({
      ok: false,
      message: "permission denied",
    });
  });
});

describe("listLeads / listStaffMembers", () => {
  it("maps lead rows from snake_case to camelCase DTOs", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: [
            {
              id: "lead-1",
              conversation_id: null,
              assigned_staff_id: "closer-1",
              estado: "nuevo",
              fuente: "web",
              monto: null,
              notas: null,
              created_at: "2026-07-05T00:00:00Z",
              updated_at: "2026-07-05T00:00:00Z",
            },
          ],
          error: null,
        },
      }),
    );
    const result = await listLeads();
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "lead-1",
          conversationId: null,
          assignedStaffId: "closer-1",
          estado: "nuevo",
          fuente: "web",
          monto: null,
          notas: null,
          createdAt: "2026-07-05T00:00:00Z",
          updatedAt: "2026-07-05T00:00:00Z",
        },
      ],
    });
  });

  it("returns an error result when the leads query fails", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: { message: "boom" } } }),
    );
    await expect(listLeads()).resolves.toEqual({ ok: false, message: "boom" });
  });

  it("maps staff_members rows including the commission ledger", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: [{ user_id: "closer-1", email: "a@b.com", role: "closer", comision: 10, total_ganado: 120 }],
          error: null,
        },
      }),
    );
    const result = await listStaffMembers();
    expect(result).toEqual({
      ok: true,
      data: [{ userId: "closer-1", email: "a@b.com", role: "closer", comision: 10, totalGanado: 120 }],
    });
  });
});
