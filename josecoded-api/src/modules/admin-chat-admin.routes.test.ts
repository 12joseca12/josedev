import type { Env } from '../types/env.types';

const baseEnv = {
  API_MODE: 'development',
  WORKER_URL: 'http://127.0.0.1:8787',
  WORKER_INTERNAL_TOKEN: 'local-dev-worker-internal-token',
  CORS_ORIGINS: '',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
} satisfies Env;

const AUTH_HEADERS = { authorization: 'Bearer test-token', 'content-type': 'application/json' };

/** Mocks `requireUser` (via `verifySupabaseUser`) to authenticate as a fixed user. */
function mockAuthenticatedUser(user: { id: string; email?: string }) {
  jest.doMock('../services/supabase.service', () => ({
    verifySupabaseUser: jest.fn().mockResolvedValue(user),
  }));
}

type PgStoreMocks = {
  assertAdmin: jest.Mock;
  listConversationsForAdmin: jest.Mock;
  getConversationMessagesForAdmin: jest.Mock;
  insertAdminMessage: jest.Mock;
  setConversationAiEnabled: jest.Mock;
  markConversationRead: jest.Mock;
};

function mockPgStore(overrides: Partial<PgStoreMocks> = {}) {
  class AdminAccessDeniedError extends Error {}
  const mocks: PgStoreMocks = {
    assertAdmin: jest.fn().mockResolvedValue(undefined),
    listConversationsForAdmin: jest.fn().mockResolvedValue([]),
    getConversationMessagesForAdmin: jest.fn().mockResolvedValue([]),
    insertAdminMessage: jest.fn().mockResolvedValue({}),
    setConversationAiEnabled: jest.fn().mockResolvedValue(undefined),
    markConversationRead: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  jest.doMock('../services/admin-chat.pg-store', () => ({
    AdminAccessDeniedError,
    ...mocks,
  }));
  return { mocks, AdminAccessDeniedError };
}

const VALID_CONV_ID = '11111111-1111-4111-8111-111111111111';

describe('admin-chat-admin routes', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('requires Authorization (401) before checking admin role', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    mockPgStore();
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request('/conversations', {}, baseEnv);
    expect(res.status).toBe(401);
  });

  it('returns 403 when assertAdmin rejects with AdminAccessDeniedError', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'closer-1' });
    const { AdminAccessDeniedError } = mockPgStore();
    jest.doMock('../services/admin-chat.pg-store', () => ({
      AdminAccessDeniedError,
      assertAdmin: jest.fn().mockRejectedValue(new AdminAccessDeniedError('nope')),
      listConversationsForAdmin: jest.fn(),
      getConversationMessagesForAdmin: jest.fn(),
      insertAdminMessage: jest.fn(),
      setConversationAiEnabled: jest.fn(),
      markConversationRead: jest.fn(),
    }));
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      '/conversations',
      { headers: AUTH_HEADERS },
      baseEnv,
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { ok: boolean; error?: { code?: string } };
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe('forbidden');
  });

  it('GET /conversations returns the list from the store for an authenticated admin', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    const summary = [
      {
        id: VALID_CONV_ID,
        userId: 'user-1',
        userEmail: 'user1@example.com',
        lastMessagePreview: 'hola',
        lastMessageAt: '2026-01-01T00:00:00Z',
        aiEnabled: true,
        unread: true,
      },
    ];
    const { mocks } = mockPgStore({
      listConversationsForAdmin: jest.fn().mockResolvedValue(summary),
    });
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      '/conversations',
      { headers: AUTH_HEADERS },
      baseEnv,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data?: unknown };
    expect(json.ok).toBe(true);
    expect(json.data).toEqual(summary);
    expect(mocks.assertAdmin).toHaveBeenCalledWith(expect.anything(), { id: 'admin-1' });
  });

  it('POST /conversations/:id/messages validates the body (400 on empty content)', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    const { mocks } = mockPgStore();
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      `/conversations/${VALID_CONV_ID}/messages`,
      { method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify({ content: '' }) },
      baseEnv,
    );
    expect(res.status).toBe(400);
    expect(mocks.insertAdminMessage).not.toHaveBeenCalled();
  });

  it('POST /conversations/:id/messages inserts an admin message (does not touch the AI pipeline)', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    const inserted = {
      id: 'msg-1',
      conversationId: VALID_CONV_ID,
      senderRole: 'admin',
      senderId: 'admin-1',
      content: 'Hola, soy Jose',
      messageType: 'text',
      metadata: {},
      createdAt: '2026-01-01T00:00:00Z',
    };
    const { mocks } = mockPgStore({
      insertAdminMessage: jest.fn().mockResolvedValue(inserted),
    });
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      `/conversations/${VALID_CONV_ID}/messages`,
      { method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify({ content: 'Hola, soy Jose' }) },
      baseEnv,
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { ok: boolean; data?: unknown };
    expect(json.data).toEqual(inserted);
    expect(mocks.insertAdminMessage).toHaveBeenCalledWith(expect.anything(), {
      conversationId: VALID_CONV_ID,
      adminId: 'admin-1',
      content: 'Hola, soy Jose',
    });
  });

  it('POST /conversations/:id/ai toggles ai_enabled', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    const { mocks } = mockPgStore();
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      `/conversations/${VALID_CONV_ID}/ai`,
      { method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify({ enabled: false }) },
      baseEnv,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data?: unknown };
    expect(json.data).toEqual({ conversationId: VALID_CONV_ID, aiEnabled: false });
    expect(mocks.setConversationAiEnabled).toHaveBeenCalledWith(expect.anything(), VALID_CONV_ID, false);
  });

  it('POST /conversations/:id/read marks the conversation read', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    const { mocks } = mockPgStore();
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      `/conversations/${VALID_CONV_ID}/read`,
      { method: 'POST', headers: AUTH_HEADERS },
      baseEnv,
    );
    expect(res.status).toBe(200);
    expect(mocks.markConversationRead).toHaveBeenCalledWith(expect.anything(), VALID_CONV_ID);
  });

  it('GET /conversations/:id/messages rejects a malformed conversation id (400)', async () => {
    jest.resetModules();
    mockAuthenticatedUser({ id: 'admin-1' });
    const { mocks } = mockPgStore();
    const { adminChatAdminRoutes } = await import('./admin-chat-admin.routes');

    const res = await adminChatAdminRoutes.request(
      '/conversations/not-a-uuid/messages',
      { headers: AUTH_HEADERS },
      baseEnv,
    );
    expect(res.status).toBe(400);
    expect(mocks.getConversationMessagesForAdmin).not.toHaveBeenCalled();
  });
});
