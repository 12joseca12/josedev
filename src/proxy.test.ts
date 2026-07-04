import { resolveStaffRole } from "./proxy";

type MockUser = { id: string } | null;

/** Construye un cliente Supabase falso con la misma forma que usa resolveStaffRole. */
function makeMockSupabase(opts: {
  user: MockUser;
  staffRow?: { role: "admin" | "closer" } | null;
  staffLookupError?: unknown;
}) {
  const { user, staffRow = null, staffLookupError = null } = opts;
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: staffRow, error: staffLookupError }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, shape-compatible only where used
  } as any;
}

describe("resolveStaffRole", () => {
  it("returns null when there is no authenticated user", async () => {
    const supabase = makeMockSupabase({ user: null });
    await expect(resolveStaffRole(supabase)).resolves.toBeNull();
  });

  it("returns the role for an authenticated staff member", async () => {
    const supabase = makeMockSupabase({
      user: { id: "user-1" },
      staffRow: { role: "admin" },
    });
    await expect(resolveStaffRole(supabase)).resolves.toBe("admin");
  });

  it("returns the closer role for an authenticated closer", async () => {
    const supabase = makeMockSupabase({
      user: { id: "user-2" },
      staffRow: { role: "closer" },
    });
    await expect(resolveStaffRole(supabase)).resolves.toBe("closer");
  });

  it("fails closed (returns null) when the user has no staff_members row", async () => {
    const supabase = makeMockSupabase({ user: { id: "user-3" }, staffRow: null });
    await expect(resolveStaffRole(supabase)).resolves.toBeNull();
  });

  it("fails closed (returns null) when the staff_members lookup errors", async () => {
    const supabase = makeMockSupabase({
      user: { id: "user-4" },
      staffRow: { role: "admin" },
      staffLookupError: new Error("connection reset"),
    });
    // Aunque haya una fila, un error de lookup nunca debe otorgar acceso.
    await expect(resolveStaffRole(supabase)).resolves.toBeNull();
  });
});
