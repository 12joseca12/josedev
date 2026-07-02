import app from './index';
import { forumResetMock } from './services/forum.store';

type ApiFailBody = { ok: false; error: { code: string; message: string; details?: unknown } };
type ApiOkBody<T> = { ok: true; data: T };

const baseEnv = {
  API_MODE: 'development' as const,
  WORKER_URL: 'https://example.com',
  WORKER_INTERNAL_TOKEN: 'test-internal-token-12345',
  CORS_ORIGINS: 'http://localhost:3000',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key-12345',
};

const bearer = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.test';

let origFetch: typeof fetch;
let workerAiBodies: unknown[];
let supabaseFetchCount: number;

function installFetchMock(workerResponseFactory: () => unknown) {
  origFetch = globalThis.fetch;
  workerAiBodies = [];
  supabaseFetchCount = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('example.supabase.co')) {
      supabaseFetchCount += 1;
      const user = {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',
        email: 'contract@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: { full_name: 'Contract User' },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('example.com/ai/chat')) {
      workerAiBodies.push(JSON.parse((init?.body as string) ?? '{}'));
      const body = workerResponseFactory();
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return origFetch(input, init);
  };
}

function restoreFetch() {
  globalThis.fetch = origFetch;
}

beforeEach(() => {
  forumResetMock();
});

function minimalNewEntryBody() {
  const slug = `c${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  return {
    thematicSlug: 'architecture',
    slug,
    title: 'T',
    segments: [{ type: 'text' as const, content: 'h' }],
  };
}

test('POST /api/v1/forum/entries sin sesión → envelope unauthorized', async () => {
  const res = await app.request(
    'http://localhost/api/v1/forum/entries',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalNewEntryBody()),
    },
    baseEnv,
  );
  expect(res.status).toBe(401);
  const json = (await res.json()) as ApiFailBody;
  expect(json.ok).toBe(false);
  expect(json.error.code).toBe('unauthorized');
  expect(json.error.message).toMatch(/Authentication required/i);
});

test('FORUM_MODERATION_DISABLED=true: POST entrada mínima → 201 y no llama /ai/chat', async () => {
  installFetchMock(() => ({ verdict: 'ALLOW' }));
  try {
    const env = { ...baseEnv, FORUM_MODERATION_DISABLED: 'true' as const };
    const res = await app.request(
      'http://localhost/api/v1/forum/entries',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: bearer,
        },
        body: JSON.stringify(minimalNewEntryBody()),
      },
      env,
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as ApiOkBody<{ slug: string; thematicSlug: string }>;
    expect(json.ok).toBe(true);
    expect(json.data.thematicSlug).toBe('architecture');
    expect(typeof json.data.slug === 'string' && json.data.slug.length > 0).toBe(true);
    expect(workerAiBodies.length).toBe(0);
    expect(supabaseFetchCount >= 1).toBe(true);
  } finally {
    restoreFetch();
  }
});

test('FORUM_MODERATION_DISABLED=false + worker DENY → 422 content_rejected', async () => {
  installFetchMock(() => ({ reply: 'DENY' }));
  try {
    const env = { ...baseEnv, FORUM_MODERATION_DISABLED: 'false' as const };
    const res = await app.request(
      'http://localhost/api/v1/forum/entries',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: bearer,
        },
        body: JSON.stringify(minimalNewEntryBody()),
      },
      env,
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as ApiFailBody;
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('content_rejected');
    expect(json.error.message).toMatch(/moderation/i);
    expect(workerAiBodies.length).toBe(1);
  } finally {
    restoreFetch();
  }
});

test('FORUM_MODERATION_DISABLED=false + respuesta sin ALLOW/DENY → 503 moderation_unavailable', async () => {
  installFetchMock(() => ({ ok: true, score: 0.5 }));
  try {
    const env = { ...baseEnv, FORUM_MODERATION_DISABLED: 'false' as const };
    const res = await app.request(
      'http://localhost/api/v1/forum/entries',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: bearer,
        },
        body: JSON.stringify(minimalNewEntryBody()),
      },
      env,
    );
    expect(res.status).toBe(503);
    const json = (await res.json()) as ApiFailBody;
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe('moderation_unavailable');
    expect(workerAiBodies.length).toBe(1);
  } finally {
    restoreFetch();
  }
});

test('FORUM_MODERATION_DISABLED=false + worker ALLOW → 201', async () => {
  installFetchMock(() => ({ text: 'ALLOW' }));
  try {
    const env = { ...baseEnv, FORUM_MODERATION_DISABLED: 'false' as const };
    const res = await app.request(
      'http://localhost/api/v1/forum/entries',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: bearer,
        },
        body: JSON.stringify(minimalNewEntryBody()),
      },
      env,
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as ApiOkBody<{ slug: string }>;
    expect(json.ok).toBe(true);
    expect(json.data.slug.length > 0).toBe(true);
    expect(workerAiBodies.length).toBe(1);
  } finally {
    restoreFetch();
  }
});
