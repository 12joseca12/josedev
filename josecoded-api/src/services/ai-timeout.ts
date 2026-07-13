import type { Env } from '../types/env.types';

/** Timeout para el proxy de /ai/chat al worker. Default 30s (bajo el límite de
 *  subrequest de Workers) — suficiente para superar el corte de 10s heredado. */
export function resolveAiChatTimeoutMs(env: Env): number {
  const fallback = 30_000;
  const raw = env.AI_CHAT_TIMEOUT_MS;
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
