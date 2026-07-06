type QueryResult = { data: unknown; error: unknown };

function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    eq: () => builder,
    select: () => builder,
    update: () => builder,
    insert: () => builder,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  return builder;
}

/** Cookie store falso — suficiente para que `cookies()` de `next/headers` no reviente. */
const mockCookieStore = {
  getAll: () => [],
  set: () => {},
};

jest.mock("next/headers", () => ({
  cookies: async () => mockCookieStore,
}));

const mockActionSupabase = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: () => mockActionSupabase(),
}));

const mockServiceClient = jest.fn();

jest.mock("../../../../../lib/supabase/service-client", () => ({
  getSupabaseServiceRoleClient: () => mockServiceClient(),
}));

function makeCookieSupabase(opts: { role: "admin" | "closer" | null; userId?: string | null }) {
  const { role, userId = "user-1" } = opts;
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    from: () => makeQueryBuilder({ data: role ? { role } : null, error: null }),
  };
}

/** Service-role client cuyas queries fallarían de inmediato si algo las llama — usado para asserar "nunca se llegó al service role". */
function makeUncalledServiceClient() {
  return {
    from: () => {
      throw new Error("service-role client should not be used for a non-admin caller");
    },
    auth: {
      admin: {
        listUsers: () => {
          throw new Error("service-role client should not be used for a non-admin caller");
        },
        inviteUserByEmail: () => {
          throw new Error("service-role client should not be used for a non-admin caller");
        },
      },
    },
  };
}

beforeEach(() => {
  mockActionSupabase.mockReset();
  mockServiceClient.mockReset();
  mockServiceClient.mockReturnValue(makeUncalledServiceClient());
});

describe("admin re-check (review C2) — non-admin callers never reach the service role", () => {
  it("provisionAccess rejects a closer", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "closer" }));
    const { provisionAccess } = await import("./actions");
    const result = await provisionAccess("client-1", "cliente@example.com");
    expect(result).toEqual({ ok: false, message: "forbidden" });
  });

  it("provisionAccess rejects an unauthenticated caller", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: null, userId: null }));
    const { provisionAccess } = await import("./actions");
    const result = await provisionAccess("client-1", "cliente@example.com");
    expect(result).toEqual({ ok: false, message: "no-session" });
  });

  it("provisionAccess rejects an authenticated non-staff user (no staff_members row)", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: null }));
    const { provisionAccess } = await import("./actions");
    const result = await provisionAccess("client-1", "cliente@example.com");
    expect(result).toEqual({ ok: false, message: "forbidden" });
  });

  it("approveExtraDirect rejects a closer", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "closer" }));
    const { approveExtraDirect } = await import("./actions");
    const result = await approveExtraDirect("extra-1", 500);
    expect(result).toEqual({ ok: false, message: "forbidden" });
  });

  it("sendExtraToPipeline rejects a closer", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "closer" }));
    const { sendExtraToPipeline } = await import("./actions");
    const result = await sendExtraToPipeline("extra-1");
    expect(result).toEqual({ ok: false, message: "forbidden" });
  });

  it("rejectExtra rejects a closer", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "closer" }));
    const { rejectExtra } = await import("./actions");
    const result = await rejectExtra("extra-1");
    expect(result).toEqual({ ok: false, message: "forbidden" });
  });
});

describe("admin callers reach the service role", () => {
  it("approveExtraDirect updates the extra when the caller is admin", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "admin" }));
    let capturedPayload: unknown;
    mockServiceClient.mockReturnValue({
      from: () => ({
        update: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    });
    const { approveExtraDirect } = await import("./actions");
    const result = await approveExtraDirect("extra-1", 500);
    expect(result).toEqual({ ok: true });
    expect(capturedPayload).toEqual({ estado: "activo", monto: 500, gratis: false });
  });

  it("rejectExtra updates estado to rechazado when the caller is admin", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "admin" }));
    let capturedPayload: unknown;
    mockServiceClient.mockReturnValue({
      from: () => ({
        update: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    });
    const { rejectExtra } = await import("./actions");
    const result = await rejectExtra("extra-1");
    expect(result).toEqual({ ok: true });
    expect(capturedPayload).toEqual({ estado: "rechazado" });
  });

  it("sendExtraToPipeline quotes monto from pack_extras.precio and links source_lead_id", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "admin" }));
    let insertedLeadPayload: unknown;
    let linkedExtraPayload: unknown;
    const tables: Record<string, unknown> = {
      client_pack_extras: {
        select: () => makeQueryBuilder({ data: { id: "extra-1", pack_extra_id: "pe-1", estado: "solicitado" }, error: null }),
      },
      pack_extras: {
        select: () => makeQueryBuilder({ data: { precio: 750 }, error: null }),
      },
      leads: {
        insert: (payload: unknown) => {
          insertedLeadPayload = payload;
          return makeQueryBuilder({ data: { id: "lead-new-1" }, error: null });
        },
      },
    };
    mockServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table === "client_pack_extras") {
          // Segunda llamada (el link final) usa `update`, la primera `select`.
          return {
            select: (tables.client_pack_extras as { select: () => unknown }).select,
            update: (payload: unknown) => {
              linkedExtraPayload = payload;
              return makeQueryBuilder({ data: null, error: null });
            },
          };
        }
        return tables[table];
      },
    });
    const { sendExtraToPipeline } = await import("./actions");
    const result = await sendExtraToPipeline("extra-1");
    expect(result).toEqual({ ok: true });
    expect(insertedLeadPayload).toEqual({ is_upsell: true, monto: 750, conversation_id: null });
    expect(linkedExtraPayload).toEqual({ source_lead_id: "lead-new-1" });
  });

  it("provisionAccess links an existing auth.users match instead of inviting", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "admin" }));
    let linkedPayload: unknown;
    mockServiceClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [{ id: "existing-user-1", email: "Cliente@Example.com" }] },
            error: null,
          }),
          inviteUserByEmail: () => {
            throw new Error("should not invite when the user already exists");
          },
        },
      },
      from: () => ({
        update: (payload: unknown) => {
          linkedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    });
    const { provisionAccess } = await import("./actions");
    const result = await provisionAccess("client-1", "cliente@example.com");
    expect(result).toEqual({ ok: true });
    expect(linkedPayload).toEqual({ user_id: "existing-user-1" });
  });

  it("provisionAccess invites a brand-new email when no auth.users match exists", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "admin" }));
    let linkedPayload: unknown;
    let invitedEmail: string | undefined;
    mockServiceClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          inviteUserByEmail: async (email: string) => {
            invitedEmail = email;
            return { data: { user: { id: "new-user-1" } }, error: null };
          },
        },
      },
      from: () => ({
        update: (payload: unknown) => {
          linkedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    });
    const { provisionAccess } = await import("./actions");
    const result = await provisionAccess("client-1", "nuevo@example.com");
    expect(result).toEqual({ ok: true });
    expect(invitedEmail).toBe("nuevo@example.com");
    expect(linkedPayload).toEqual({ user_id: "new-user-1" });
  });

  it("provisionAccess falls back to link on a TOCTOU invite race ('already exists')", async () => {
    mockActionSupabase.mockReturnValue(makeCookieSupabase({ role: "admin" }));
    let linkedPayload: unknown;
    let listUsersCalls = 0;
    mockServiceClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: async () => {
            listUsersCalls += 1;
            // Primera llamada (fast-path check): no existe todavía.
            // Segunda llamada (tras el invite fallar por TOCTOU): ya existe.
            if (listUsersCalls === 1) return { data: { users: [] }, error: null };
            return { data: { users: [{ id: "raced-user-1", email: "raced@example.com" }] }, error: null };
          },
          inviteUserByEmail: async () => ({ data: null, error: { message: "User already registered" } }),
        },
      },
      from: () => ({
        update: (payload: unknown) => {
          linkedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    });
    const { provisionAccess } = await import("./actions");
    const result = await provisionAccess("client-1", "raced@example.com");
    expect(result).toEqual({ ok: true });
    expect(linkedPayload).toEqual({ user_id: "raced-user-1" });
  });
});
