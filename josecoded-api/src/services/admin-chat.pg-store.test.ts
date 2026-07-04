import type { Env } from '../types/env.types';

const baseEnv = {
  API_MODE: 'development',
  WORKER_URL: 'http://127.0.0.1:8787',
  WORKER_INTERNAL_TOKEN: 'local-dev-worker-internal-token',
  CORS_ORIGINS: '',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
} satisfies Env;

// GoTrueAdminApi.listUsers doesn't honor the `global.fetch` override the way
// postgrest-js does (verified: intercepting fetch works for `.from()` calls but
// a real network request still goes out for `.auth.admin.listUsers()`), so the
// Auth-admin fallback path is tested by mocking the SDK client shape directly
// instead of intercepting fetch.
type StaffMembersQueryResult = { data: unknown; error: unknown };

function makeFakeSupabaseClient(opts: {
  staffMembersSelect: StaffMembersQueryResult;
  authUsersSchemaSelect?: StaffMembersQueryResult;
  listUsersResult?: { data: { users: Array<{ id: string; email?: string }> }; error: unknown };
  upsertSpy?: (payload: unknown) => void;
}) {
  const {
    staffMembersSelect,
    authUsersSchemaSelect = { data: null, error: new Error('not found') },
    listUsersResult = { data: { users: [] }, error: null },
    upsertSpy,
  } = opts;

  return {
    from: (table: string) => {
      if (table === 'staff_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve(staffMembersSelect),
          }),
          upsert: (payload: unknown) => {
            upsertSpy?.(payload);
            return Promise.resolve({ data: [payload], error: null });
          },
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(authUsersSchemaSelect),
            }),
          }),
        };
      }
      throw new Error(`unexpected table in test double: ${table}`);
    },
    schema: () => ({
      from: (table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve(authUsersSchemaSelect),
              }),
            }),
          };
        }
        throw new Error(`unexpected schema table in test double: ${table}`);
      },
    }),
    auth: {
      admin: {
        listUsers: () => Promise.resolve(listUsersResult),
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, shape-compatible only where used
  } as any;
}

describe('resolveSuperuserId', () => {
  it('short-circuits on ADMIN_SUPERUSER_ID without creating a Supabase client', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => {
        throw new Error('should not be called when ADMIN_SUPERUSER_ID is set');
      }),
    }));
    const { resolveSuperuserId } = await import('./admin-chat.pg-store');
    const id = await resolveSuperuserId({ ...baseEnv, ADMIN_SUPERUSER_ID: 'preset-id-123' });
    expect(id).toBe('preset-id-123');
  });

  it('resolves from staff_members when a single admin row exists (no email match needed)', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFakeSupabaseClient({
          staffMembersSelect: {
            data: [{ user_id: 'staff-row-id', email: 'someone-else@example.com' }],
            error: null,
          },
        }),
      ),
    }));
    const { resolveSuperuserId } = await import('./admin-chat.pg-store');
    const id = await resolveSuperuserId(baseEnv);
    expect(id).toBe('staff-row-id');
  });

  it('resolves from staff_members by matching email among multiple admin rows', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFakeSupabaseClient({
          staffMembersSelect: {
            data: [
              { user_id: 'other-admin-id', email: 'other-admin@example.com' },
              { user_id: 'matching-id', email: 'sanchezgaricajosecarlos12@gmail.com' },
            ],
            error: null,
          },
        }),
      ),
    }));
    const { resolveSuperuserId } = await import('./admin-chat.pg-store');
    const id = await resolveSuperuserId(baseEnv);
    expect(id).toBe('matching-id');
  });

  it('falls back to Auth admin lookup and upserts into staff_members when no row matches', async () => {
    jest.resetModules();
    const upserted: unknown[] = [];
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFakeSupabaseClient({
          staffMembersSelect: { data: [], error: null },
          listUsersResult: {
            data: { users: [{ id: 'auth-found-id', email: 'sanchezgaricajosecarlos12@gmail.com' }] },
            error: null,
          },
          upsertSpy: (payload) => upserted.push(payload),
        }),
      ),
    }));
    const { resolveSuperuserId } = await import('./admin-chat.pg-store');
    const id = await resolveSuperuserId(baseEnv);
    expect(id).toBe('auth-found-id');
    expect(upserted).toHaveLength(1);
    expect(upserted[0]).toMatchObject({ user_id: 'auth-found-id', role: 'admin' });
  });

  it('throws a clear error when the superuser cannot be resolved anywhere', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFakeSupabaseClient({
          staffMembersSelect: { data: [], error: null },
          listUsersResult: { data: { users: [] }, error: null },
        }),
      ),
    }));
    const { resolveSuperuserId } = await import('./admin-chat.pg-store');
    await expect(resolveSuperuserId(baseEnv)).rejects.toThrow(/Superuser not found/);
  });
});
