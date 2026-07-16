import type { Env } from '../types/env.types';

const baseEnv = {
  API_MODE: 'development',
  WORKER_URL: 'http://127.0.0.1:8787',
  WORKER_INTERNAL_TOKEN: 'local-dev-worker-internal-token',
  CORS_ORIGINS: '',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
} satisfies Env;

describe('notifyAdminOfNewMessage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('does not call fetch when N8N_CHAT_WEBHOOK_URL is not configured', async () => {
    const { notifyAdminOfNewMessage } = await import('./admin-chat-notify.service');
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await notifyAdminOfNewMessage(baseEnv, {
      conversationId: 'conv-1',
      userId: 'user-1',
      userEmail: 'visitor@example.com',
      text: 'hola',
      aiEnabled: true,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs the message payload to N8N_CHAT_WEBHOOK_URL when configured', async () => {
    const { notifyAdminOfNewMessage } = await import('./admin-chat-notify.service');
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const env = { ...baseEnv, N8N_CHAT_WEBHOOK_URL: 'https://n8n.example.com/webhook/chat' };
    await notifyAdminOfNewMessage(env, {
      conversationId: 'conv-1',
      userId: 'user-1',
      userEmail: 'visitor@example.com',
      text: 'hola',
      aiEnabled: false,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://n8n.example.com/webhook/chat');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      conversationId: 'conv-1',
      userId: 'user-1',
      userEmail: 'visitor@example.com',
      text: 'hola',
      aiEnabled: false,
    });
  });

  it('never throws when the webhook request fails', async () => {
    const { notifyAdminOfNewMessage } = await import('./admin-chat-notify.service');
    const fetchSpy = jest.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchSpy as unknown as typeof fetch;

    const env = { ...baseEnv, N8N_CHAT_WEBHOOK_URL: 'https://n8n.example.com/webhook/chat' };
    await expect(
      notifyAdminOfNewMessage(env, {
        conversationId: 'conv-1',
        userId: 'user-1',
        userEmail: 'visitor@example.com',
        text: 'hola',
        aiEnabled: true,
      }),
    ).resolves.toBeUndefined();
  });
});
