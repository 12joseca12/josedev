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

type QueryResult = { data: unknown; error: unknown };

function makeFlagsAndHistoryClient(opts: {
  conversationsSelect?: QueryResult;
  messagesSelect?: QueryResult;
}) {
  return {
    from: (table: string) => {
      if (table === 'admin_chat_conversations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve(opts.conversationsSelect ?? { data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'admin_chat_messages') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve(opts.messagesSelect ?? { data: [], error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table in test double: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, shape-compatible only where used
  } as any;
}

describe('getConversationFlags', () => {
  it('returns aiEnabled=true when the column is true', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFlagsAndHistoryClient({ conversationsSelect: { data: { ai_enabled: true }, error: null } }),
      ),
    }));
    const { getConversationFlags } = await import('./admin-chat.pg-store');
    const flags = await getConversationFlags(baseEnv, 'conv-1');
    expect(flags).toEqual({ aiEnabled: true });
  });

  it('returns aiEnabled=false when the column is false', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFlagsAndHistoryClient({ conversationsSelect: { data: { ai_enabled: false }, error: null } }),
      ),
    }));
    const { getConversationFlags } = await import('./admin-chat.pg-store');
    const flags = await getConversationFlags(baseEnv, 'conv-1');
    expect(flags).toEqual({ aiEnabled: false });
  });

  it('throws when the query errors', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFlagsAndHistoryClient({ conversationsSelect: { data: null, error: new Error('boom') } }),
      ),
    }));
    const { getConversationFlags } = await import('./admin-chat.pg-store');
    await expect(getConversationFlags(baseEnv, 'conv-1')).rejects.toThrow('boom');
  });
});

describe('getRecentHistory', () => {
  it('excludes excludeMessageId and maps admin/assistant sender_role to assistant, chronologically', async () => {
    jest.resetModules();
    // Rows as the DB would return them (most-recent first, DESC) — mirrors what
    // getRecentMessagesForPrompt fetches before it reverses to chronological order.
    const descRows = [
      {
        id: 'm4',
        conversation_id: 'conv-1',
        sender_role: 'user',
        sender_id: 'user-1',
        content: 'current turn (just inserted)',
        message_type: 'text',
        metadata: {},
        created_at: '2026-01-01T00:00:03Z',
      },
      {
        id: 'm3',
        conversation_id: 'conv-1',
        sender_role: 'admin',
        sender_id: 'admin-1',
        content: 'manual admin reply',
        message_type: 'text',
        metadata: {},
        created_at: '2026-01-01T00:00:02Z',
      },
      {
        id: 'm2',
        conversation_id: 'conv-1',
        sender_role: 'assistant',
        sender_id: 'admin-1',
        content: 'hi there',
        message_type: 'text',
        metadata: {},
        created_at: '2026-01-01T00:00:01Z',
      },
      {
        id: 'm1',
        conversation_id: 'conv-1',
        sender_role: 'user',
        sender_id: 'user-1',
        content: 'hola',
        message_type: 'text',
        metadata: {},
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFlagsAndHistoryClient({ messagesSelect: { data: descRows, error: null } }),
      ),
    }));
    const { getRecentHistory } = await import('./admin-chat.pg-store');
    const history = await getRecentHistory(baseEnv, 'conv-1', 'm4', 8);

    expect(history).toEqual([
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: 'hi there' },
      { role: 'assistant', content: 'manual admin reply' },
    ]);
    expect(history.some((h) => h.content.includes('current turn'))).toBe(false);
  });

  it('respects the limit after excluding the current turn', async () => {
    jest.resetModules();
    // 9 rows DESC (limit+1 = 8+1): newest is the just-inserted user turn, then 8 older
    // messages — after exclusion exactly `limit` (8) should remain, oldest dropped.
    const descRows = Array.from({ length: 9 }, (_, i) => {
      const idx = 8 - i; // 8 (newest) .. 0 (oldest)
      return {
        id: `m${idx}`,
        conversation_id: 'conv-1',
        sender_role: idx % 2 === 0 ? 'user' : 'assistant',
        sender_id: idx % 2 === 0 ? 'user-1' : 'admin-1',
        content: `msg-${idx}`,
        message_type: 'text',
        metadata: {},
        created_at: `2026-01-01T00:00:${String(idx).padStart(2, '0')}Z`,
      };
    });
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() =>
        makeFlagsAndHistoryClient({ messagesSelect: { data: descRows, error: null } }),
      ),
    }));
    const { getRecentHistory } = await import('./admin-chat.pg-store');
    const history = await getRecentHistory(baseEnv, 'conv-1', 'm8', 8);

    expect(history).toHaveLength(8);
    expect(history.map((h) => h.content)).toEqual([
      'msg-0',
      'msg-1',
      'msg-2',
      'msg-3',
      'msg-4',
      'msg-5',
      'msg-6',
      'msg-7',
    ]);
  });
});
