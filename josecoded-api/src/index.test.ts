import app from './index';

const baseEnv = {
  API_MODE: 'development',
  WORKER_URL: 'https://example.com',
  WORKER_INTERNAL_TOKEN: 'test-internal-token-12345',
  CORS_ORIGINS: 'http://localhost:3000',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key-12345',
} as const;

test('GET /api/v1/health returns ok', async () => {
  const res = await app.request('http://localhost/api/v1/health', {}, baseEnv);
  expect(res.status).toBe(200);
  const json = (await res.json()) as { ok: boolean };
  expect(json.ok).toBe(true);
});

test('GET /ai/chat is gone (removed dead route)', async () => {
  const res = await app.request('http://localhost/ai/chat', { method: 'POST' }, baseEnv);
  expect(res.status).toBe(404);
});

test('dev proxy is disabled in production', async () => {
  const res = await app.request(
    'http://localhost/api/dev/worker/system/status',
    { method: 'GET' },
    { ...baseEnv, API_MODE: 'production' },
  );
  expect(res.status).toBe(404);
});

test('v1 protected route requires Authorization', async () => {
  const res = await app.request('http://localhost/api/v1/system/status', {}, baseEnv);
  expect(res.status).toBe(401);
  const json = (await res.json()) as { ok: boolean; error?: { code?: string } };
  expect(json.ok).toBe(false);
  expect(json.error?.code).toBe('unauthorized');
});

test('GET /api/v1/forum/thematics succeeds with empty bindings in development (local wrangler)', async () => {
  const res = await app.request('http://localhost/api/v1/forum/thematics', {}, {});
  expect(res.status).toBe(200);
  const json = (await res.json()) as { ok: boolean; data?: unknown };
  expect(json.ok).toBe(true);
  expect(Array.isArray(json.data)).toBe(true);
});

test('GET /api/v1/forum/thematics succeeds with partial wrangler vars (WORKER_URL only)', async () => {
  const partial = {
    API_MODE: 'development',
    WORKER_URL: 'https://example.com',
    CORS_ORIGINS: 'http://localhost:3000',
  };
  const res = await app.request('http://localhost/api/v1/forum/thematics', {}, partial);
  expect(res.status).toBe(200);
  const json = (await res.json()) as { ok: boolean; data?: unknown };
  expect(json.ok).toBe(true);
  expect(Array.isArray(json.data)).toBe(true);
});

test('POST /demo/android/start returns quickly with starting status', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    if (url.endsWith('/emulator/diagnostics')) {
      return new Response(JSON.stringify({
        ok: true,
        data: {
          container: {
            exists: true,
            name: 'android-emulator',
            status: 'running',
            running: true,
          },
          packageName: 'com.tres24',
          viewerUrl: 'http://127.0.0.1:6080/vnc_lite.html',
          screenViewerUrl: '/emulator/screen/viewer',
          bootCompleted: false,
          packageInstalled: false,
        },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, data: { status: 'starting' } }), { status: 200 });
  }) as typeof fetch;

  try {
    const res = await app.request(
      'http://localhost/demo/android/start',
      { method: 'POST' },
      baseEnv,
    );
    expect(res.status).toBe(202);
    const json = (await res.json()) as {
      ok: boolean;
      data?: { status?: string; viewerUrl?: string | null; screenViewerUrl?: string | null };
    };
    expect(json.ok).toBe(true);
    expect(json.data?.status).toBe('starting');
    expect(json.data?.viewerUrl).toBe('http://127.0.0.1:6080/vnc_lite.html');
    expect(json.data?.screenViewerUrl).toBe('http://localhost/demo/android/screen/viewer');
    expect(calls.some((url) => url.endsWith('/emulator/session/warmup'))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GET /demo/android/status uses PUBLIC_API_BASE_URL for screen viewer', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('/emulator/diagnostics')) {
      return new Response(JSON.stringify({
        ok: true,
        data: {
          container: {
            exists: true,
            name: 'android-emulator',
            status: 'running',
            running: true,
          },
          packageName: 'com.tres24',
          viewerUrl: 'http://127.0.0.1:6080/vnc_lite.html',
          screenViewerUrl: '/emulator/screen/viewer',
          bootCompleted: true,
          packageInstalled: true,
        },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
  }) as typeof fetch;

  try {
    const res = await app.request(
      'http://127.0.0.1:8787/demo/android/status',
      { method: 'GET' },
      { ...baseEnv, PUBLIC_API_BASE_URL: 'https://api.example.com' },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      data?: { screenViewerUrl?: string | null };
    };
    expect(json.ok).toBe(true);
    expect(json.data?.screenViewerUrl).toBe('https://api.example.com/demo/android/screen/viewer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GET /demo/android/screen/viewer proxies clean screen viewer', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    return new Response(`
      <canvas id="screen"></canvas>
      <script>
        fetch('/emulator/screen.png');
        fetch('http://127.0.0.1:4000/emulator/screen/tap', { method: 'POST' });
      </script>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }) as typeof fetch;

  try {
    const res = await app.request(
      'http://localhost/demo/android/screen/viewer',
      { method: 'GET' },
      { ...baseEnv, PUBLIC_API_BASE_URL: 'https://api.example.com' },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const html = await res.text();
    expect(html).toMatch(/https:\/\/api\.example\.com\/demo\/android\/screen\.png/);
    expect(html).toMatch(/https:\/\/api\.example\.com\/demo\/android\/screen\/tap/);
    expect(html.includes('127.0.0.1')).toBe(false);
    expect(calls.some((url) => url.endsWith('/emulator/screen/viewer'))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST /demo/android/warmup skips diagnostics and starts warmup', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    return new Response(JSON.stringify({
      ok: true,
      data: {
        status: 'starting',
        containerName: '',
        packageName: '',
        packageInstalled: false,
        bootCompleted: false,
        containerRunning: false,
        viewerUrl: null,
        errorCode: null,
        errorMessage: null,
      },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const res = await app.request(
      'http://localhost/demo/android/warmup',
      { method: 'POST' },
      baseEnv,
    );
    expect(res.status).toBe(202);
    const json = (await res.json()) as { ok: boolean; data?: { status?: string } };
    expect(json.ok).toBe(true);
    expect(json.data?.status).toBe('starting');
    expect(calls.some((url) => url.endsWith('/emulator/session/warmup'))).toBe(true);
    expect(calls.some((url) => url.endsWith('/emulator/diagnostics'))).toBe(false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
