import {
  addExtra,
  createTask,
  getClient,
  getMyProject,
  listClients,
  listComments,
  listPack,
  listTasks,
  postAdminComment,
  postComment,
  requestUpgrade,
  updatePhase,
  updateTask,
} from "./clients-api";

type QueryResult = { data: unknown; error: unknown };

/**
 * Query builder falso — mismo patrón que leads-api.test.ts: cada método de
 * encadenado devuelve el mismo objeto "thenable" que se resuelve al `result`
 * configurado, sin importar en qué eslabón de la cadena el código bajo test
 * deje de encadenar.
 */
function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {
    eq: () => builder,
    is: () => builder,
    select: () => builder,
    order: () => builder,
    update: () => builder,
    insert: () => builder,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  };
  return builder;
}

function makeMockSupabase(opts: {
  userId?: string | null;
  fromResult: QueryResult;
}) {
  const { userId = "client-1", fromResult } = opts;
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

describe("getMyProject", () => {
  it("returns the caller's client row", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: {
            id: "client-1",
            lead_id: "lead-1",
            user_id: "user-1",
            pack_template_id: "pack-1",
            project_phase: "briefing",
            created_at: "2026-07-05T00:00:00Z",
            updated_at: "2026-07-05T00:00:00Z",
          },
          error: null,
        },
      }),
    );
    const result = await getMyProject();
    expect(result).toEqual({
      ok: true,
      data: {
        id: "client-1",
        leadId: "lead-1",
        userId: "user-1",
        packTemplateId: "pack-1",
        projectPhase: "briefing",
        createdAt: "2026-07-05T00:00:00Z",
        updatedAt: "2026-07-05T00:00:00Z",
      },
    });
  });

  it("returns error if there is no authenticated user", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ userId: null, fromResult: { data: null, error: null } }));
    await expect(getMyProject()).resolves.toEqual({ ok: false, message: "no-session" });
  });

  it("silently returns no-data when RLS finds no row (not a client)", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: null, error: null } }));
    await expect(getMyProject()).resolves.toEqual({ ok: true, data: null });
  });

  it("propagates a genuine query error", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: { message: "boom" } } }),
    );
    await expect(getMyProject()).resolves.toEqual({ ok: false, message: "boom" });
  });
});

describe("postComment", () => {
  it("maps camelCase args into the snake_case insert payload", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: () => ({
        insert: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await postComment("client-1", "hola", "task-1");
    expect(capturedPayload).toEqual({
      client_id: "client-1",
      task_id: "task-1",
      author_user_id: "user-1",
      body: "hola",
      internal: false,
    });
  });

  it("defaults task_id to null when omitted (general comment)", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: () => ({
        insert: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await postComment("client-1", "hola");
    expect(capturedPayload).toEqual({
      client_id: "client-1",
      task_id: null,
      author_user_id: "user-1",
      body: "hola",
      internal: false,
    });
  });

  it("returns error if there is no authenticated user", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ userId: null, fromResult: { data: null, error: null } }));
    await expect(postComment("client-1", "hola")).resolves.toEqual({ ok: false, message: "no-session" });
  });

  it("surfaces the RLS error instead of swallowing it", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: { message: "permission denied" } } }),
    );
    await expect(postComment("client-1", "hola")).resolves.toEqual({
      ok: false,
      message: "permission denied",
    });
  });
});

describe("requestUpgrade", () => {
  it("inserts a clean 'solicitado' request — client never sets activo/monto/gratis", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: () => ({
        insert: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await requestUpgrade("client-1", "extra-1");
    expect(capturedPayload).toEqual({
      client_id: "client-1",
      pack_extra_id: "extra-1",
      estado: "solicitado",
      gratis: false,
      monto: null,
      source_lead_id: null,
    });
  });

  it("surfaces the RLS rejection (e.g. duplicate vigente extra) instead of hiding it", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: { data: null, error: { message: "duplicate key value violates unique constraint" } },
      }),
    );
    const result = await requestUpgrade("client-1", "extra-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/duplicate key/);
  });
});

describe("listTasks / listComments / listPack", () => {
  it("maps client_tasks rows from snake_case to camelCase DTOs", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: [
            {
              id: "task-1",
              client_id: "client-1",
              titulo: "Setup DNS",
              descripcion: null,
              estado: "pendiente",
              orden: 0,
              created_at: "2026-07-05T00:00:00Z",
              updated_at: "2026-07-05T00:00:00Z",
            },
          ],
          error: null,
        },
      }),
    );
    const result = await listTasks("client-1");
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "task-1",
          clientId: "client-1",
          titulo: "Setup DNS",
          descripcion: null,
          estado: "pendiente",
          orden: 0,
          createdAt: "2026-07-05T00:00:00Z",
          updatedAt: "2026-07-05T00:00:00Z",
        },
      ],
    });
  });

  it("returns an error result when listTasks query fails", async () => {
    mockGetClient.mockReturnValue(makeMockSupabase({ fromResult: { data: null, error: { message: "boom" } } }));
    await expect(listTasks("client-1")).resolves.toEqual({ ok: false, message: "boom" });
  });

  it("maps client_task_comments rows", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: [
            {
              id: "comment-1",
              client_id: "client-1",
              task_id: null,
              author_user_id: "user-1",
              body: "hola",
              internal: false,
              created_at: "2026-07-05T00:00:00Z",
            },
          ],
          error: null,
        },
      }),
    );
    const result = await listComments("client-1");
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "comment-1",
          clientId: "client-1",
          taskId: null,
          authorUserId: "user-1",
          body: "hola",
          internal: false,
          createdAt: "2026-07-05T00:00:00Z",
        },
      ],
    });
  });

  it("maps listPack rows (client_pack_extras joined with pack_extras)", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: [
            {
              id: "extra-1",
              client_id: "client-1",
              pack_extra_id: "pe-1",
              gratis: false,
              monto: null,
              estado: "solicitado",
              source_lead_id: null,
              created_at: "2026-07-05T00:00:00Z",
              pack_extras: { id: "pe-1", slug: "seo", nombre: "SEO", precio: 100 },
            },
          ],
          error: null,
        },
      }),
    );
    const result = await listPack("client-1");
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "extra-1",
          clientId: "client-1",
          packExtraId: "pe-1",
          gratis: false,
          monto: null,
          estado: "solicitado",
          sourceLeadId: null,
          createdAt: "2026-07-05T00:00:00Z",
          packExtra: { id: "pe-1", slug: "seo", nombre: "SEO", precio: 100 },
        },
      ],
    });
  });
});

describe("listClients / getClient (admin reads)", () => {
  it("maps listClients rows", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({
        fromResult: {
          data: [
            {
              id: "client-1",
              lead_id: "lead-1",
              user_id: null,
              pack_template_id: null,
              project_phase: "briefing",
              created_at: "2026-07-05T00:00:00Z",
              updated_at: "2026-07-05T00:00:00Z",
            },
          ],
          error: null,
        },
      }),
    );
    const result = await listClients();
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: "client-1",
          leadId: "lead-1",
          userId: null,
          packTemplateId: null,
          projectPhase: "briefing",
          createdAt: "2026-07-05T00:00:00Z",
          updatedAt: "2026-07-05T00:00:00Z",
        },
      ],
    });
  });

  it("surfaces an RLS/not-found error from getClient", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: { message: "permission denied" } } }),
    );
    await expect(getClient("client-1")).resolves.toEqual({ ok: false, message: "permission denied" });
  });
});

describe("admin mutations (createTask/updateTask/updatePhase/postAdminComment/addExtra)", () => {
  it("createTask inserts titulo/descripcion for the given client", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: () => ({
        insert: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await createTask("client-1", "Setup DNS", "detalle");
    expect(capturedPayload).toEqual({ client_id: "client-1", titulo: "Setup DNS", descripcion: "detalle" });
  });

  it("updateTask surfaces RLS error when caller isn't admin", async () => {
    mockGetClient.mockReturnValue(
      makeMockSupabase({ fromResult: { data: null, error: { message: "permission denied" } } }),
    );
    await expect(updateTask("task-1", { estado: "hecho" })).resolves.toEqual({
      ok: false,
      message: "permission denied",
    });
  });

  it("updatePhase updates project_phase", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: () => ({
        update: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await updatePhase("client-1", "desarrollo");
    expect(capturedPayload).toEqual({ project_phase: "desarrollo" });
  });

  it("postAdminComment allows setting internal=true", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: () => ({
        insert: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await postAdminComment("client-1", "nota interna", true, "task-1");
    expect(capturedPayload).toEqual({
      client_id: "client-1",
      task_id: "task-1",
      author_user_id: "admin-1",
      body: "nota interna",
      internal: true,
    });
  });

  it("addExtra inserts an extra with an explicit estado (admin-managed)", async () => {
    let capturedPayload: unknown;
    const supabase = {
      auth: { getUser: async () => ({ data: { user: { id: "admin-1" } } }) },
      from: () => ({
        insert: (payload: unknown) => {
          capturedPayload = payload;
          return makeQueryBuilder({ data: null, error: null });
        },
      }),
    };
    mockGetClient.mockReturnValue(supabase);
    await addExtra("client-1", "pe-1", { gratis: true, monto: null, estado: "incluido" });
    expect(capturedPayload).toEqual({
      client_id: "client-1",
      pack_extra_id: "pe-1",
      gratis: true,
      monto: null,
      estado: "incluido",
    });
  });
});
