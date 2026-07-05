import { NextRequest } from "next/server";

type MockUser = { id: string } | null;

// Mock de @supabase/ssr para poder inyectar un cliente falso en las pruebas de
// integración de proxy() sin pegarle a una red/base real.
let mockCreateServerClientImpl: () => unknown = () => ({});
jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => {
    void args;
    return mockCreateServerClientImpl();
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- import tras el mock para que jest.mock aplique
const { proxy, resolveClientAccess, resolveStaffRole } = require("./proxy");

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

/** Construye un cliente Supabase falso con la misma forma que usa resolveClientAccess. */
function makeMockSupabaseForClientAccess(opts: {
  user: MockUser;
  clientRow?: { id: string } | null;
  clientLookupError?: unknown;
}) {
  const { user, clientRow = null, clientLookupError = null } = opts;
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: clientRow, error: clientLookupError }),
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

describe("resolveClientAccess", () => {
  it("returns false when there is no authenticated user", async () => {
    const supabase = makeMockSupabaseForClientAccess({ user: null });
    await expect(resolveClientAccess(supabase)).resolves.toBe(false);
  });

  it("returns true for an authenticated user with a clients row", async () => {
    const supabase = makeMockSupabaseForClientAccess({
      user: { id: "user-1" },
      clientRow: { id: "client-1" },
    });
    await expect(resolveClientAccess(supabase)).resolves.toBe(true);
  });

  it("returns false when the user has no clients row", async () => {
    const supabase = makeMockSupabaseForClientAccess({ user: { id: "user-2" }, clientRow: null });
    await expect(resolveClientAccess(supabase)).resolves.toBe(false);
  });

  it("fails closed (returns false) when the clients lookup errors", async () => {
    const supabase = makeMockSupabaseForClientAccess({
      user: { id: "user-3" },
      clientRow: { id: "client-3" },
      clientLookupError: new Error("connection reset"),
    });
    // Aunque haya una fila, un error de lookup nunca debe otorgar acceso.
    await expect(resolveClientAccess(supabase)).resolves.toBe(false);
  });
});

describe("proxy() — /area-clientes guard", () => {
  function makeRequest(pathname: string) {
    return new NextRequest(new URL(`https://example.com${pathname}`));
  }

  it("redirects to /auth when there is no session", async () => {
    mockCreateServerClientImpl = () => makeMockSupabaseForClientAccess({ user: null });

    const response = await proxy(makeRequest("/es/area-clientes"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/es/auth");
  });

  it("redirects to /perfil when authenticated but not a client", async () => {
    mockCreateServerClientImpl = () =>
      makeMockSupabaseForClientAccess({ user: { id: "user-1" }, clientRow: null });

    const response = await proxy(makeRequest("/es/area-clientes/tareas"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/es/perfil");
  });

  it("passes through when authenticated and a client", async () => {
    mockCreateServerClientImpl = () =>
      makeMockSupabaseForClientAccess({ user: { id: "user-1" }, clientRow: { id: "client-1" } });

    const response = await proxy(makeRequest("/es/area-clientes"));

    // NextResponse.next() no es un redirect y no reescribe: pasa a la ruta pedida.
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
