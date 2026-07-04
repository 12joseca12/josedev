import type { EmulatorSessionDTO, EmulatorStatusDTO } from "@/lib/types";

export const LIVE_DEMO_SESSION_STORAGE_KEY = "josecoded.androidLiveDemo.session";
export const LIVE_DEMO_WARMUP_STORAGE_KEY = "josecoded.androidLiveDemo.warmupAttempted";

export function emulatorStatusToSession(status: EmulatorStatusDTO): EmulatorSessionDTO | null {
  if (status.status !== "ready" || !status.viewerUrl) return null;
  return {
    status: status.status,
    containerName: status.containerName,
    packageName: status.packageName,
    packageInstalled: status.packageInstalled,
    viewerUrl: status.screenViewerUrl ?? status.viewerUrl,
    screenViewerUrl: status.screenViewerUrl,
  };
}

export function readStoredEmulatorSession(): EmulatorSessionDTO | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LIVE_DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<EmulatorSessionDTO>;
    if (typeof data.viewerUrl !== "string" || !data.viewerUrl.trim()) return null;
    return {
      status: typeof data.status === "string" ? data.status : "ready",
      containerName: typeof data.containerName === "string" ? data.containerName : "",
      packageName: typeof data.packageName === "string" ? data.packageName : "",
      packageInstalled: Boolean(data.packageInstalled),
      viewerUrl: data.viewerUrl.trim(),
      screenViewerUrl:
        typeof data.screenViewerUrl === "string" && data.screenViewerUrl.trim()
          ? data.screenViewerUrl.trim()
          : null,
    };
  } catch {
    return null;
  }
}

export function storeEmulatorSession(session: EmulatorSessionDTO) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LIVE_DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function markEmulatorWarmupAttempted() {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem(LIVE_DEMO_WARMUP_STORAGE_KEY) === "true") return false;
  window.sessionStorage.setItem(LIVE_DEMO_WARMUP_STORAGE_KEY, "true");
  return true;
}
