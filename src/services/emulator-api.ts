import type { EmulatorRuntimeStatus, EmulatorSessionDTO, EmulatorStatusDTO } from "@/lib/types";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string; details?: unknown } };
type ApiEnvelope<T> = ApiOk<T> | ApiFail;

const DEV_API_FALLBACK = "http://localhost:8787";
const EMULATOR_RUNTIME_STATUSES = new Set<EmulatorRuntimeStatus>([
  "starting",
  "ready",
  "stopped",
  "unavailable",
  "failed",
]);

/** @internal exported for tests */
export function normalizeEmulatorViewerUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/vnc_lite.html");
    if (!url.pathname.endsWith("/vnc_lite.html")) {
      url.pathname = `${url.pathname.replace(/\/$/, "")}/vnc_lite.html`;
    }
    url.searchParams.set("autoconnect", "true");
    url.searchParams.set("resize", "scale");
    return url.toString();
  } catch {
    return trimmed;
  }
}

/** @internal exported for tests */
export function resolveScreenViewerUrl(raw: string, apiBase: string | null = getApiBase()): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed, apiBase ?? window.location.origin);
    if ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && apiBase) {
      return new URL(url.pathname + url.search + url.hash, apiBase).toString();
    }
    if (trimmed.startsWith("/") && !apiBase) return trimmed;
    return url.toString();
  } catch {
    return trimmed;
  }
}

function getApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_JOSECODED_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    return DEV_API_FALLBACK;
  }
  return null;
}

function parseEnvelope<T>(body: unknown): ApiEnvelope<T> {
  if (!body || typeof body !== "object" || !("ok" in body)) {
    return { ok: false, error: { code: "internal_error", message: "Invalid API response" } };
  }
  return body as ApiEnvelope<T>;
}

/** @internal exported for tests */
export function parseEmulatorSession(data: unknown): EmulatorSessionDTO | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const viewerUrl =
    typeof row.viewerUrl === "string" && row.viewerUrl.trim()
      ? normalizeEmulatorViewerUrl(row.viewerUrl)
      : null;
  const screenViewerUrl =
    typeof row.screenViewerUrl === "string" && row.screenViewerUrl.trim()
      ? resolveScreenViewerUrl(row.screenViewerUrl)
      : null;
  if (!viewerUrl && !screenViewerUrl) return null;
  return {
    status: typeof row.status === "string" ? row.status : "unknown",
    containerName: typeof row.containerName === "string" ? row.containerName : "",
    packageName: typeof row.packageName === "string" ? row.packageName : "",
    packageInstalled: Boolean(row.packageInstalled),
    viewerUrl: screenViewerUrl ?? viewerUrl ?? "",
    screenViewerUrl,
  };
}

/** @internal exported for tests */
export function parseEmulatorStatus(data: unknown): EmulatorStatusDTO | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const status = typeof row.status === "string" ? row.status : "";
  if (!EMULATOR_RUNTIME_STATUSES.has(status as EmulatorRuntimeStatus)) return null;
  return {
    status: status as EmulatorRuntimeStatus,
    containerName: typeof row.containerName === "string" ? row.containerName : "",
    packageName: typeof row.packageName === "string" ? row.packageName : "",
    packageInstalled: Boolean(row.packageInstalled),
    bootCompleted: Boolean(row.bootCompleted),
    containerRunning: Boolean(row.containerRunning),
    viewerUrl:
      typeof row.viewerUrl === "string" && row.viewerUrl.trim()
        ? normalizeEmulatorViewerUrl(row.viewerUrl)
        : null,
    screenViewerUrl:
      typeof row.screenViewerUrl === "string" && row.screenViewerUrl.trim()
        ? resolveScreenViewerUrl(row.screenViewerUrl)
        : null,
    errorCode: typeof row.errorCode === "string" && row.errorCode.trim() ? row.errorCode.trim() : null,
    errorMessage:
      typeof row.errorMessage === "string" && row.errorMessage.trim() ? row.errorMessage.trim() : null,
  };
}

function parseMaybeNestedStatus(data: unknown): EmulatorStatusDTO | null {
  return (
    parseEmulatorStatus(data) ??
    (data && typeof data === "object" && "data" in data
      ? parseEmulatorStatus((data as { data: unknown }).data)
      : null)
  );
}

export function emulatorApiIsConfigured(): boolean {
  return Boolean(getApiBase());
}

/** Pide al backend que caliente el emulador Android sin mantener una espera larga en el cliente. */
export async function startAndroidEmulatorDemo(): Promise<ApiEnvelope<EmulatorStatusDTO>> {
  const base = getApiBase();
  if (!base) {
    return { ok: false, error: { code: "internal_error", message: "API not configured" } };
  }

  const res = await fetch(`${base}/demo/android/start`, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const envelope = parseEnvelope<unknown>(await res.json().catch(() => null));
  if (!envelope.ok) {
    return envelope;
  }

  const status = parseMaybeNestedStatus(envelope.data);
  if (!status) {
    const session = parseEmulatorSession(envelope.data);
    if (session) {
      return {
        ok: true,
        data: {
          status: "ready",
          containerName: session.containerName,
          packageName: session.packageName,
          packageInstalled: session.packageInstalled,
          bootCompleted: true,
          containerRunning: true,
          viewerUrl: session.viewerUrl,
          screenViewerUrl: session.screenViewerUrl,
          errorCode: null,
          errorMessage: null,
        },
      };
    }
    return {
      ok: false,
      error: { code: "internal_error", message: "Emulator status response is invalid" },
    };
  }

  return { ok: true, data: status };
}

/** Dispara el warm-up global sin consultar diagnostics antes. */
export async function warmupAndroidEmulatorDemo(): Promise<ApiEnvelope<EmulatorStatusDTO>> {
  const base = getApiBase();
  if (!base) {
    return { ok: false, error: { code: "internal_error", message: "API not configured" } };
  }

  const res = await fetch(`${base}/demo/android/warmup`, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const envelope = parseEnvelope<unknown>(await res.json().catch(() => null));
  if (!envelope.ok) {
    return envelope;
  }

  const status = parseMaybeNestedStatus(envelope.data);
  if (!status) {
    return {
      ok: false,
      error: { code: "internal_error", message: "Emulator warm-up response is invalid" },
    };
  }

  return { ok: true, data: status };
}

/** Consulta si el emulador ya está listo para conectar el iframe VNC. */
export async function getAndroidEmulatorDemoStatus(): Promise<ApiEnvelope<EmulatorStatusDTO>> {
  const base = getApiBase();
  if (!base) {
    return { ok: false, error: { code: "internal_error", message: "API not configured" } };
  }

  const res = await fetch(`${base}/demo/android/status`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const envelope = parseEnvelope<unknown>(await res.json().catch(() => null));
  if (!envelope.ok) {
    return envelope;
  }

  const status = parseMaybeNestedStatus(envelope.data);
  if (!status) {
    return {
      ok: false,
      error: { code: "internal_error", message: "Emulator status response is invalid" },
    };
  }

  return { ok: true, data: status };
}
