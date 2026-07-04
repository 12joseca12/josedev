"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { EmulatorDemoView, EmulatorSessionDTO, EmulatorStatusDTO, Locale } from "@/lib/types";
import { getAndroidEmulatorDemoStatus, startAndroidEmulatorDemo } from "@/services/emulator-api";
import {
  emulatorStatusToSession,
  readStoredEmulatorSession,
  storeEmulatorSession,
} from "@/services/emulator-session-storage";
import { t } from "@/services/literals";

const LIVE_DEMO_POLL_INTERVAL_MS = 5_000;
const LIVE_DEMO_MAX_POLLS = 18;

type State = {
  view: EmulatorDemoView;
  loading: boolean;
  session: EmulatorSessionDTO | null;
  error: string | null;
  statusMessage: string | null;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useEmulatorDemo(locale: Locale) {
  const mountedRef = useRef(true);
  const [state, setState] = useState<State>({
    view: "preview",
    loading: false,
    session: null,
    error: null,
    statusMessage: null,
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showPreview = useCallback(() => {
    setState((s) => ({ ...s, view: "preview", error: null, statusMessage: null }));
  }, []);

  const resolveLiveDemoError = useCallback(
    (res: { error: { code: string; message: string; details?: unknown } }) => {
      const details = res.error.details;
      const backendCode =
        details && typeof details === "object"
          ? (details as { backendCode?: string }).backendCode
          : undefined;
      if (res.error.code === "conflict" || backendCode === "EMULATOR_SESSION_LOCKED") {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoConflict");
      }
      if (res.error.code === "unauthorized" || backendCode === "UNAUTHORIZED") {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoUnauthorized");
      }
      if (backendCode === "EMULATOR_BOOT_TIMEOUT" || res.error.message.includes("booting in time")) {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoBootTimeout");
      }
      if (backendCode === "GATEWAY_TIMEOUT" || res.error.message.includes("Gateway timed out")) {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoGatewayTimeout");
      }
      return res.error.message || t(locale, "sobreMiShowcase.catinfo.liveDemoError");
    },
    [locale],
  );

  const resolveStatusError = useCallback(
    (status: EmulatorStatusDTO) =>
      resolveLiveDemoError({
        error: {
          code: "upstream_error",
          message: status.errorMessage ?? "Android emulator warm-up failed",
          details: { backendCode: status.errorCode ?? "EMULATOR_WARMUP_FAILED" },
        },
      }),
    [resolveLiveDemoError],
  );

  const resolveStatusMessage = useCallback(
    (status: EmulatorStatusDTO | null) => {
      if (!status) return t(locale, "sobreMiShowcase.catinfo.liveDemoPreparing");
      if (!status.containerRunning) {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoStartingContainer");
      }
      if (!status.bootCompleted) {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoBootingAndroid");
      }
      if (!status.packageInstalled) {
        return t(locale, "sobreMiShowcase.catinfo.liveDemoPreparingApp");
      }
      return t(locale, "sobreMiShowcase.catinfo.liveDemoPreparing");
    },
    [locale],
  );

  const connectIfReady = useCallback((status: EmulatorStatusDTO) => {
    const session = emulatorStatusToSession(status);
    if (!session) return false;
    storeEmulatorSession(session);
    if (!mountedRef.current) return false;
    setState({
      view: "emulator",
      loading: false,
      session,
      error: null,
      statusMessage: null,
    });
    return true;
  }, []);

  const pollUntilReady = useCallback(async () => {
    for (let attempt = 0; attempt < LIVE_DEMO_MAX_POLLS; attempt += 1) {
      await wait(LIVE_DEMO_POLL_INTERVAL_MS);
      const statusRes = await getAndroidEmulatorDemoStatus();
      if (!statusRes.ok) {
        return statusRes;
      }
      if (connectIfReady(statusRes.data)) {
        return { ok: true as const, data: statusRes.data };
      }
      if (statusRes.data.status === "failed") {
        return {
          ok: false as const,
          error: {
            code: "upstream_error",
            message: statusRes.data.errorMessage ?? "Android emulator warm-up failed",
            details: { backendCode: statusRes.data.errorCode ?? "EMULATOR_WARMUP_FAILED" },
          },
        };
      }
      if (!mountedRef.current) {
        return {
          ok: false as const,
          error: { code: "internal_error", message: "Live demo was unmounted" },
        };
      }
      setState((s) => ({
        ...s,
        view: "preparing",
        loading: true,
        statusMessage: resolveStatusMessage(statusRes.data),
      }));
    }
    return {
      ok: false as const,
      error: {
        code: "upstream_error",
        message: "Android emulator did not become ready in time",
        details: { backendCode: "EMULATOR_BOOT_TIMEOUT" },
      },
    };
  }, [connectIfReady, resolveStatusMessage]);

  const startLiveDemo = useCallback(async () => {
    let alreadyLoading = false;
    setState((s) => {
      if (s.loading) {
        alreadyLoading = true;
        return s;
      }
      return {
        ...s,
        view: "preparing",
        loading: true,
        error: null,
        statusMessage: t(locale, "sobreMiShowcase.catinfo.liveDemoPreparing"),
      };
    });
    if (alreadyLoading) return false;

    const storedSession = readStoredEmulatorSession();
    if (storedSession) {
      setState({
        view: "emulator",
        loading: false,
        session: storedSession,
        error: null,
        statusMessage: null,
      });
      return true;
    }

    const currentStatus = await getAndroidEmulatorDemoStatus();
    if (currentStatus.ok && connectIfReady(currentStatus.data)) {
      return true;
    }
    if (currentStatus.ok && currentStatus.data.status === "failed") {
      setState((s) => ({
        ...s,
        view: "preview",
        loading: false,
        error: resolveStatusError(currentStatus.data),
        statusMessage: null,
      }));
      return false;
    }
    if (currentStatus.ok) {
      setState((s) => ({ ...s, statusMessage: resolveStatusMessage(currentStatus.data) }));
    }

    const res = await startAndroidEmulatorDemo();
    if (!res.ok) {
      setState((s) => ({
        ...s,
        view: "preview",
        loading: false,
        error: resolveLiveDemoError(res),
        statusMessage: null,
      }));
      return false;
    }
    if (connectIfReady(res.data)) {
      return true;
    }
    if (res.data.status === "failed") {
      setState((s) => ({
        ...s,
        view: "preview",
        loading: false,
        error: resolveStatusError(res.data),
        statusMessage: null,
      }));
      return false;
    }
    setState((s) => ({
      ...s,
      view: "preparing",
      loading: true,
      statusMessage: resolveStatusMessage(res.data),
    }));

    const pollRes = await pollUntilReady();
    if (!pollRes.ok) {
      setState((s) => ({
        ...s,
        view: "preview",
        loading: false,
        error: resolveLiveDemoError(pollRes),
        statusMessage: null,
      }));
      return false;
    }
    return true;
  }, [
    connectIfReady,
    locale,
    pollUntilReady,
    resolveLiveDemoError,
    resolveStatusError,
    resolveStatusMessage,
  ]);

  return {
    ...state,
    isEmulatorActive: state.view === "emulator" && Boolean(state.session?.viewerUrl),
    isPreparingEmulator: state.view === "preparing" || state.loading,
    viewerUrl: state.session?.viewerUrl ?? null,
    showPreview,
    startLiveDemo,
  };
}
