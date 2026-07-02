import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { parseEnv } from '../config/env';
import {
  callWorker,
  fetchWorkerResponse,
  toUpstreamFail,
  unwrapBackendPayload,
  upstreamHttpStatus,
} from '../services/worker.service';
import { ok } from '../utils/api-response';

export const emulatorRoutes = new Hono<{ Bindings: Env }>();

/** Debe superar el boot del backend (p. ej. 120 × 2 s) + arranque Docker e instalación APK. */
const DEFAULT_EMULATOR_START_TIMEOUT_MS = 360_000;
const EMULATOR_STATUS_TIMEOUT_MS = 15_000;
const PUBLIC_SCREEN_VIEWER_PATH = '/demo/android/screen/viewer';
const PUBLIC_SCREEN_PNG_PATH = '/demo/android/screen.png';

type EmulatorContainerPayload = {
  exists?: boolean;
  name?: string;
  status?: string;
  running?: boolean;
};

type EmulatorDiagnosticsPayload = {
  container?: EmulatorContainerPayload;
  packageName?: string;
  viewerUrl?: string;
  screenViewerUrl?: string;
  bootCompleted?: boolean;
  packageInstalled?: boolean;
};

type EmulatorStatusPayload = {
  status: 'starting' | 'ready' | 'stopped' | 'unavailable' | 'failed';
  containerName: string;
  packageName: string;
  packageInstalled: boolean;
  bootCompleted: boolean;
  containerRunning: boolean;
  viewerUrl: string | null;
  screenViewerUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type WarmupState =
  | { status: 'idle' }
  | { status: 'starting'; promise: Promise<unknown> }
  | { status: 'failed'; errorCode: string; errorMessage: string };

let warmupState: WarmupState = { status: 'idle' };

type BackgroundExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void;
};

function scheduleBackgroundWarmup(getContext: () => BackgroundExecutionContext, warmupPromise: Promise<unknown>) {
  try {
    getContext().waitUntil(warmupPromise);
  } catch {
    // Unit tests and some local runtimes do not expose Cloudflare's ExecutionContext.
  }
}

function normalizeDiagnostics(raw: unknown): EmulatorDiagnosticsPayload {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as Record<string, unknown>;
  const container =
    row.container && typeof row.container === 'object'
      ? (row.container as Record<string, unknown>)
      : undefined;

  return {
    container: container
      ? {
          exists: typeof container.exists === 'boolean' ? container.exists : undefined,
          name: typeof container.name === 'string' ? container.name : undefined,
          status: typeof container.status === 'string' ? container.status : undefined,
          running: typeof container.running === 'boolean' ? container.running : undefined,
        }
      : undefined,
    packageName: typeof row.packageName === 'string' ? row.packageName : undefined,
    viewerUrl: typeof row.viewerUrl === 'string' ? row.viewerUrl : undefined,
    screenViewerUrl: typeof row.screenViewerUrl === 'string' ? row.screenViewerUrl : undefined,
    bootCompleted: typeof row.bootCompleted === 'boolean' ? row.bootCompleted : undefined,
    packageInstalled: typeof row.packageInstalled === 'boolean' ? row.packageInstalled : undefined,
  };
}

function getPublicBaseUrl(env: Env, requestUrl: string) {
  return env.PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? new URL(requestUrl).origin;
}

function publicScreenViewerUrl(env: Env, requestUrl: string) {
  return `${getPublicBaseUrl(env, requestUrl)}${PUBLIC_SCREEN_VIEWER_PATH}`;
}

function rewriteScreenViewerHtml(html: string, env: Env, requestUrl: string) {
  const baseUrl = getPublicBaseUrl(env, requestUrl);
  return html
    .replaceAll('http://127.0.0.1:4000/emulator/screen.png', `${baseUrl}${PUBLIC_SCREEN_PNG_PATH}`)
    .replaceAll('http://127.0.0.1:4000/emulator/screen/tap', `${baseUrl}/demo/android/screen/tap`)
    .replaceAll('http://127.0.0.1:4000/emulator/screen/swipe', `${baseUrl}/demo/android/screen/swipe`)
    .replaceAll('http://127.0.0.1:4000/emulator/screen/text', `${baseUrl}/demo/android/screen/text`)
    .replaceAll('/emulator/screen.png', `${baseUrl}${PUBLIC_SCREEN_PNG_PATH}`)
    .replaceAll('/emulator/screen/tap', `${baseUrl}/demo/android/screen/tap`)
    .replaceAll('/emulator/screen/swipe', `${baseUrl}/demo/android/screen/swipe`)
    .replaceAll('/emulator/screen/text', `${baseUrl}/demo/android/screen/text`);
}

function toEmulatorStatus(raw: unknown): EmulatorStatusPayload {
  const diagnostics = normalizeDiagnostics(raw);
  const containerRunning = diagnostics.container?.running === true;
  const bootCompleted = diagnostics.bootCompleted === true;
  const packageInstalled = diagnostics.packageInstalled === true;
  const viewerUrl = diagnostics.viewerUrl?.trim() ? diagnostics.viewerUrl.trim() : null;
  const backendScreenViewerUrl = diagnostics.screenViewerUrl?.trim() ? diagnostics.screenViewerUrl.trim() : null;
  const status: EmulatorStatusPayload['status'] =
    containerRunning && bootCompleted && packageInstalled && (backendScreenViewerUrl || viewerUrl)
      ? 'ready'
      : warmupState.status === 'failed'
        ? 'failed'
      : containerRunning
        ? 'starting'
        : diagnostics.container?.exists === false
          ? 'unavailable'
          : 'stopped';

  return {
    status,
    containerName: diagnostics.container?.name ?? '',
    packageName: diagnostics.packageName ?? '',
    packageInstalled,
    bootCompleted,
    containerRunning,
    viewerUrl,
    screenViewerUrl: backendScreenViewerUrl,
    errorCode: warmupState.status === 'failed' ? warmupState.errorCode : null,
    errorMessage: warmupState.status === 'failed' ? warmupState.errorMessage : null,
  };
}

async function getEmulatorStatus(env: Env, screenViewerUrl: string): Promise<EmulatorStatusPayload> {
  const raw = await callWorker<unknown>(env, '/emulator/diagnostics', {
    method: 'GET',
    timeoutMs: EMULATOR_STATUS_TIMEOUT_MS,
  });
  const status = toEmulatorStatus(unwrapBackendPayload(raw));
  return {
    ...status,
    screenViewerUrl: status.screenViewerUrl ? screenViewerUrl : null,
  };
}

function getEmulatorStartTimeoutMs(env: Env): number {
  const configured = env.EMULATOR_SESSION_TIMEOUT_MS
    ? Number(env.EMULATOR_SESSION_TIMEOUT_MS)
    : DEFAULT_EMULATOR_START_TIMEOUT_MS;
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_EMULATOR_START_TIMEOUT_MS;
}

function readBackendError(data: unknown): { errorCode: string; errorMessage: string } {
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>;
    const errorCode =
      typeof row.code === 'string'
        ? row.code
        : typeof row.errorCode === 'string'
          ? row.errorCode
          : undefined;
    const errorMessage =
      typeof row.error === 'string'
        ? row.error
        : typeof row.message === 'string'
          ? row.message
          : undefined;
    if (errorCode || errorMessage) {
      return {
        errorCode: errorCode ?? 'EMULATOR_WARMUP_FAILED',
        errorMessage: errorMessage ?? 'Android emulator warm-up failed',
      };
    }
  }

  return {
    errorCode: 'EMULATOR_WARMUP_FAILED',
    errorMessage: 'Android emulator warm-up failed',
  };
}

function readWarmupFailure(error: unknown): { errorCode: string; errorMessage: string } {
  if (error && typeof error === 'object' && 'data' in error) {
    return readBackendError((error as { data: unknown }).data);
  }
  if (error instanceof Error) {
    return {
      errorCode: error.name === 'AbortError' ? 'GATEWAY_TIMEOUT' : 'EMULATOR_WARMUP_FAILED',
      errorMessage: error.message,
    };
  }
  return readBackendError(error);
}

function startWarmup(env: Env) {
  if (warmupState.status === 'starting') return warmupState.promise;

  const promise = callWorker<unknown>(env, '/emulator/session/warmup', {
    method: 'POST',
    timeoutMs: getEmulatorStartTimeoutMs(env),
  })
    .then((result) => {
      warmupState = { status: 'idle' };
      return result;
    })
    .catch((error: unknown) => {
      const failure = readWarmupFailure(error);
      warmupState = {
        status: 'failed',
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
      };
      return undefined;
    });

  warmupState = { status: 'starting', promise };
  return promise;
}

emulatorRoutes.post('/demo/android/start', async (c) => {
  try {
    const env = parseEnv(c.env);
    const currentStatus = await getEmulatorStatus(env, publicScreenViewerUrl(env, c.req.url)).catch(() => null);
    if (currentStatus?.status === 'ready') {
      return c.json(ok(currentStatus));
    }

    const warmupPromise = startWarmup(env);
    scheduleBackgroundWarmup(() => c.executionCtx, warmupPromise);

    return c.json(ok(currentStatus ?? {
      status: 'starting',
      containerName: '',
      packageName: '',
      packageInstalled: false,
      bootCompleted: false,
      containerRunning: false,
      viewerUrl: null,
      screenViewerUrl: null,
      errorCode: null,
      errorMessage: null,
    } satisfies EmulatorStatusPayload), 202);
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});

emulatorRoutes.post('/demo/android/warmup', async (c) => {
  try {
    const env = parseEnv(c.env);
    const warmupPromise = startWarmup(env);
    scheduleBackgroundWarmup(() => c.executionCtx, warmupPromise);
    return c.json(ok({
      status: warmupState.status === 'failed' ? 'failed' : 'starting',
      containerName: '',
      packageName: '',
      packageInstalled: false,
      bootCompleted: false,
      containerRunning: false,
      viewerUrl: null,
      screenViewerUrl: null,
      errorCode: warmupState.status === 'failed' ? warmupState.errorCode : null,
      errorMessage: warmupState.status === 'failed' ? warmupState.errorMessage : null,
    } satisfies EmulatorStatusPayload), 202);
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});

emulatorRoutes.get('/demo/android/status', async (c) => {
  try {
    const env = parseEnv(c.env);
    return c.json(ok(await getEmulatorStatus(env, publicScreenViewerUrl(env, c.req.url))));
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});

emulatorRoutes.get('/demo/android/screen/viewer', async (c) => {
  try {
    const env = parseEnv(c.env);
    const response = await fetchWorkerResponse(c.env, '/emulator/screen/viewer', {
      method: 'GET',
      timeoutMs: EMULATOR_STATUS_TIMEOUT_MS,
    });
    const html = rewriteScreenViewerHtml(await response.text(), env, c.req.url);
    return new Response(html, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});

emulatorRoutes.get('/demo/android/screen.png', async (c) => {
  try {
    const response = await fetchWorkerResponse(c.env, '/emulator/screen.png', {
      method: 'GET',
      timeoutMs: EMULATOR_STATUS_TIMEOUT_MS,
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});

emulatorRoutes.post('/demo/android/screen/:action', async (c) => {
  const action = c.req.param('action');
  if (action !== 'tap' && action !== 'swipe' && action !== 'text') {
    return c.json({ ok: false, error: { code: 'not_found', message: 'Screen action not found' } }, 404);
  }

  try {
    const body = await c.req.json().catch(() => undefined);
    const response = await fetchWorkerResponse(c.env, `/emulator/screen/${action}`, {
      method: 'POST',
      body,
      timeoutMs: EMULATOR_STATUS_TIMEOUT_MS,
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});
