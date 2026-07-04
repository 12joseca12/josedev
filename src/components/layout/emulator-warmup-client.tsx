"use client";

import { useEffect } from "react";

import { warmupAndroidEmulatorDemo } from "@/services/emulator-api";
import {
  emulatorStatusToSession,
  markEmulatorWarmupAttempted,
  storeEmulatorSession,
} from "@/services/emulator-session-storage";

export function EmulatorWarmupClient() {
  useEffect(() => {
    if (!markEmulatorWarmupAttempted()) return;

    void warmupAndroidEmulatorDemo()
      .then((res) => {
        if (!res.ok) return;
        const session = emulatorStatusToSession(res.data);
        if (session) storeEmulatorSession(session);
      })
      .catch(() => undefined);
  }, []);

  return null;
}
