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

describe('ensureConversation', () => {
  it('inserts assigned_staff_id (NOT admin_id) when creating a new conversation', async () => {
    jest.resetModules();
    let insertPayload: unknown;
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
              insert: (payload: unknown) => {
                insertPayload = payload;
                return {
                  select: () => ({
                    single: () => Promise.resolve({ data: { id: 'new-conv-id' }, error: null }),
                  }),
                };
              },
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));
    const { ensureConversation } = await import('./admin-chat.pg-store');
    // ADMIN_SUPERUSER_ID set so resolveSuperuserId short-circuits without needing
    // staff_members mocks — isolates this test to the ensureConversation insert shape.
    const id = await ensureConversation({ ...baseEnv, ADMIN_SUPERUSER_ID: 'admin-user-id' }, 'user-123');

    expect(id).toBe('new-conv-id');
    expect(insertPayload).toEqual({ user_id: 'user-123', assigned_staff_id: 'admin-user-id' });
    expect(insertPayload).not.toHaveProperty('admin_id');
  });

  it('returns the existing conversation id without inserting', async () => {
    jest.resetModules();
    const insertSpy = jest.fn();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_conversations') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'existing-conv-id' }, error: null }),
                }),
              }),
              insert: insertSpy,
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));
    const { ensureConversation } = await import('./admin-chat.pg-store');
    const id = await ensureConversation({ ...baseEnv, ADMIN_SUPERUSER_ID: 'admin-user-id' }, 'user-123');

    expect(id).toBe('existing-conv-id');
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe('assertAdmin', () => {
  it('resolves when staff_members.role is admin', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'staff_members') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
                }),
              }),
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));
    const { assertAdmin } = await import('./admin-chat.pg-store');
    await expect(assertAdmin(baseEnv, { id: 'admin-1' })).resolves.toBeUndefined();
  });

  it('rejects with AdminAccessDeniedError when the role is not admin', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'staff_members') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { role: 'closer' }, error: null }),
                }),
              }),
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));
    const { assertAdmin, AdminAccessDeniedError } = await import('./admin-chat.pg-store');
    await expect(assertAdmin(baseEnv, { id: 'closer-1' })).rejects.toBeInstanceOf(AdminAccessDeniedError);
  });

  it('rejects with AdminAccessDeniedError when the user has no staff_members row', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'staff_members') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));
    const { assertAdmin, AdminAccessDeniedError } = await import('./admin-chat.pg-store');
    await expect(assertAdmin(baseEnv, { id: 'unknown-user' })).rejects.toBeInstanceOf(AdminAccessDeniedError);
  });
});

/** Builder para `admin_chat_messages` en `listConversationsForAdmin`: distingue la
 *  consulta de "último mensaje" (select 'content, created_at') de la de "unread"
 *  (select 'id') por las columnas pedidas, y usa el primer `.eq('conversation_id', …)`
 *  para elegir la fila configurada por conversación. */
function makeAdminMessagesTable(responses: {
  lastMessageByConv: Record<string, QueryResult>;
  unreadByConv: Record<string, QueryResult>;
}) {
  return (cols: string) => {
    let conversationId: string | undefined;
    const chain = {
      eq: (_col: string, val: string) => {
        conversationId = conversationId ?? val;
        return chain;
      },
      gt: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => {
        const source = cols === 'id' ? responses.unreadByConv : responses.lastMessageByConv;
        return Promise.resolve((conversationId && source[conversationId]) ?? { data: null, error: null });
      },
    };
    return chain;
  };
}

describe('listConversationsForAdmin', () => {
  it('computes unread from sender_role=user vs admin_last_read_at and orders by last_message_at desc', async () => {
    jest.resetModules();
    const conversationsRows = [
      {
        id: 'conv-unread',
        user_id: 'user-1',
        ai_enabled: true,
        admin_last_read_at: '2026-01-01T00:00:00Z',
        last_message_at: '2026-01-02T00:00:00Z',
      },
      {
        id: 'conv-read',
        user_id: 'user-2',
        ai_enabled: false,
        admin_last_read_at: '2026-01-05T00:00:00Z',
        last_message_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'conv-never-read',
        user_id: 'user-3',
        ai_enabled: true,
        admin_last_read_at: null,
        last_message_at: '2025-12-31T00:00:00Z',
      },
    ];

    const lastMessageByConv: Record<string, QueryResult> = {
      'conv-unread': { data: { content: 'hola necesito ayuda', created_at: '2026-01-02T00:00:00Z' }, error: null },
      'conv-read': { data: { content: 'gracias', created_at: '2026-01-01T00:00:00Z' }, error: null },
      'conv-never-read': { data: { content: 'primer mensaje', created_at: '2025-12-31T00:00:00Z' }, error: null },
    };
    // conv-never-read: admin_last_read_at is null -> threshold is epoch, so any user
    // message counts as unread.
    const unreadByConv: Record<string, QueryResult> = {
      'conv-unread': { data: { id: 'msg-x' }, error: null },
      'conv-read': { data: null, error: null },
      'conv-never-read': { data: { id: 'msg-y' }, error: null },
    };
    const emailByUserId: Record<string, string> = {
      'user-1': 'user1@example.com',
      'user-2': 'user2@example.com',
      'user-3': 'user3@example.com',
    };

    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_conversations') {
            return {
              select: () => ({
                order: () => Promise.resolve({ data: conversationsRows, error: null }),
              }),
            };
          }
          if (table === 'admin_chat_messages') {
            return { select: makeAdminMessagesTable({ lastMessageByConv, unreadByConv }) };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        auth: {
          admin: {
            getUserById: (val: string) =>
              Promise.resolve(
                emailByUserId[val]
                  ? { data: { user: { id: val, email: emailByUserId[val] } }, error: null }
                  : { data: { user: null }, error: null },
              ),
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));

    const { listConversationsForAdmin } = await import('./admin-chat.pg-store');
    const result = await listConversationsForAdmin(baseEnv);

    expect(result).toEqual([
      {
        id: 'conv-unread',
        userId: 'user-1',
        userEmail: 'user1@example.com',
        lastMessagePreview: 'hola necesito ayuda',
        lastMessageAt: '2026-01-02T00:00:00Z',
        aiEnabled: true,
        unread: true,
      },
      {
        id: 'conv-read',
        userId: 'user-2',
        userEmail: 'user2@example.com',
        lastMessagePreview: 'gracias',
        lastMessageAt: '2026-01-01T00:00:00Z',
        aiEnabled: false,
        unread: false,
      },
      {
        id: 'conv-never-read',
        userId: 'user-3',
        userEmail: 'user3@example.com',
        lastMessagePreview: 'primer mensaje',
        lastMessageAt: '2025-12-31T00:00:00Z',
        aiEnabled: true,
        unread: true,
      },
    ]);
  });

  it('returns an empty array when there are no conversations', async () => {
    jest.resetModules();
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_conversations') {
            return {
              select: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));
    const { listConversationsForAdmin } = await import('./admin-chat.pg-store');
    await expect(listConversationsForAdmin(baseEnv)).resolves.toEqual([]);
  });
});

describe('insertAdminMessage', () => {
  it('inserts with sender_role=admin and returns the mapped DTO', async () => {
    jest.resetModules();
    let insertPayload: unknown;
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_messages') {
            return {
              insert: (payload: unknown) => {
                insertPayload = payload;
                return {
                  select: () => ({
                    single: () =>
                      Promise.resolve({
                        data: {
                          id: 'msg-admin-1',
                          conversation_id: 'conv-1',
                          sender_role: 'admin',
                          sender_id: 'admin-1',
                          content: 'Hola, soy Jose',
                          message_type: 'text',
                          metadata: {},
                          created_at: '2026-01-01T00:00:00Z',
                        },
                        error: null,
                      }),
                  }),
                };
              },
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));

    const { insertAdminMessage } = await import('./admin-chat.pg-store');
    const message = await insertAdminMessage(baseEnv, {
      conversationId: 'conv-1',
      adminId: 'admin-1',
      content: 'Hola, soy Jose',
    });

    expect(insertPayload).toMatchObject({
      conversation_id: 'conv-1',
      sender_role: 'admin',
      sender_id: 'admin-1',
      content: 'Hola, soy Jose',
    });
    expect(message.senderRole).toBe('admin');
    expect(message.id).toBe('msg-admin-1');
  });
});

describe('setConversationAiEnabled', () => {
  it('updates ai_enabled for the conversation', async () => {
    jest.resetModules();
    let updatePayload: unknown;
    let eqCall: [string, unknown] | undefined;
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_conversations') {
            return {
              update: (payload: unknown) => {
                updatePayload = payload;
                return {
                  eq: (col: string, val: unknown) => {
                    eqCall = [col, val];
                    return Promise.resolve({ data: null, error: null });
                  },
                };
              },
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));

    const { setConversationAiEnabled } = await import('./admin-chat.pg-store');
    await setConversationAiEnabled(baseEnv, 'conv-1', false);

    expect(updatePayload).toEqual({ ai_enabled: false });
    expect(eqCall).toEqual(['id', 'conv-1']);
  });
});

describe('markConversationRead', () => {
  it('sets admin_last_read_at to a fresh timestamp', async () => {
    jest.resetModules();
    let updatePayload: { admin_last_read_at?: string } | undefined;
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_conversations') {
            return {
              update: (payload: { admin_last_read_at?: string }) => {
                updatePayload = payload;
                return {
                  eq: () => Promise.resolve({ data: null, error: null }),
                };
              },
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));

    const { markConversationRead } = await import('./admin-chat.pg-store');
    const before = Date.now();
    await markConversationRead(baseEnv, 'conv-1');
    const after = Date.now();

    expect(updatePayload?.admin_last_read_at).toBeDefined();
    const ts = new Date(updatePayload!.admin_last_read_at as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('getConversationMessagesForAdmin', () => {
  it('returns messages for the conversation in chronological order', async () => {
    jest.resetModules();
    const row = {
      id: 'm1',
      conversation_id: 'conv-1',
      sender_role: 'user',
      sender_id: 'user-1',
      content: 'hola',
      message_type: 'text',
      metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    };
    jest.doMock('./supabase.service', () => ({
      DEFAULT_ADMIN_SUPERUSER_EMAIL: 'sanchezgaricajosecarlos12@gmail.com',
      createSupabaseServiceClient: jest.fn(() => ({
        from: (table: string) => {
          if (table === 'admin_chat_messages') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: [row], error: null }),
                  }),
                }),
              }),
            };
          }
          throw new Error(`unexpected table in test double: ${table}`);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      })) as any,
    }));

    const { getConversationMessagesForAdmin } = await import('./admin-chat.pg-store');
    const messages = await getConversationMessagesForAdmin(baseEnv, 'conv-1');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 'm1', senderRole: 'user', content: 'hola' });
  });
});
