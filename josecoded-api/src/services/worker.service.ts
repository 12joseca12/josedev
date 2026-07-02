import type { Env } from '../types/env.types';
import { fail, type ApiErrorCode } from '../utils/api-response';

type WorkerMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type CallWorkerOptions = {
  method?: WorkerMethod;
  body?: unknown;
  /** Sobrescribe `WORKER_TIMEOUT_MS` para esta llamada. */
  timeoutMs?: number;
};

export class UpstreamError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
    this.data = data;
  }
}

function getWorkerTimeoutMs(env: Env): number {
  const fallback = 10_000;
  const raw = env.WORKER_TIMEOUT_MS;
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildWorkerRequestHeaders(env: Env, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.WORKER_INTERNAL_TOKEN}`,
  };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  // ngrok free: sin esto el fetch server-side puede recibir HTML interstitial en vez de JSON.
  if (env.WORKER_URL.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
}

export async function callWorker<T>(
  env: Env,
  path: string,
  options: CallWorkerOptions = {},
): Promise<T> {
  const url = `${env.WORKER_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const hasBody = options.body !== undefined;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? getWorkerTimeoutMs(env),
  );

  const response = await fetch(
    url,
    {
      method: options.method ?? 'GET',
      headers: buildWorkerRequestHeaders(env, hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    },
  ).finally(() => clearTimeout(timeout));

  const rawText = await response.text();
  let data: unknown = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    const preview = rawText.slice(0, 120).replace(/\s+/g, ' ');
    throw new UpstreamError(
      `Worker returned non-JSON (status ${response.status}): ${preview}`,
      response.status,
      { preview },
    );
  }

  if (!response.ok) {
    throw new UpstreamError('Worker request failed', response.status, data);
  }

  return data as T;
}

export async function fetchWorkerResponse(
  env: Env,
  path: string,
  options: CallWorkerOptions = {},
): Promise<Response> {
  const url = `${env.WORKER_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const hasBody = options.body !== undefined;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? getWorkerTimeoutMs(env),
  );

  return fetch(
    url,
    {
      method: options.method ?? 'GET',
      headers: buildWorkerRequestHeaders(env, hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    },
  ).finally(() => clearTimeout(timeout));
}

function upstreamErrorMessage(error: UpstreamError): string {
  const payload = error.data;
  if (payload && typeof payload === 'object') {
    const row = payload as Record<string, unknown>;
    if (typeof row.error === 'string' && row.error.trim()) {
      return row.error;
    }
  }
  return error.message;
}

function upstreamErrorCode(error: UpstreamError): ApiErrorCode {
  if (error.status === 401) return 'unauthorized';
  if (error.status === 409) return 'conflict';
  if (error.status === 504) return 'upstream_error';
  return 'upstream_error';
}

/** Código HTTP a devolver al cliente (propaga 4xx/5xx del backend cuando aplica). */
export function upstreamHttpStatus(error: unknown): number {
  if (error instanceof UpstreamError) {
    return error.status >= 400 && error.status < 600 ? error.status : 502;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 504;
  }
  return 502;
}

/** El Fastify worker responde `{ ok: true, data: T }`; extrae `data`. */
export function unwrapBackendPayload<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'ok' in raw) {
    const row = raw as { ok?: boolean; data?: T };
    if (row.ok === true && row.data !== undefined) {
      return row.data;
    }
  }
  return raw as T;
}

export function toUpstreamFail(error: unknown) {
  if (error instanceof UpstreamError) {
    const payload = error.data;
    let backendCode: string | undefined;
    if (payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).code === 'string') {
      backendCode = (payload as Record<string, string>).code;
    }
    return fail(upstreamErrorCode(error), upstreamErrorMessage(error), {
      status: error.status,
      backendCode,
      data: payload,
    });
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return fail('upstream_error', 'Gateway timed out waiting for the Android emulator session', {
      backendCode: 'GATEWAY_TIMEOUT',
    });
  }
  if (error instanceof Error) {
    return fail('upstream_error', error.message);
  }
  return fail('upstream_error', 'Unknown upstream error');
}
