import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { AdminChatConsoleMessageDTO, AdminConversationSummaryDTO } from "@/lib/types";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string };

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string; details?: unknown } };
type ApiEnvelope<T> = ApiOk<T> | ApiFail;

/** Origen por defecto en `next dev` si no hay `NEXT_PUBLIC_JOSECODED_API_URL` (mismo fallback que admin-chat-api.ts / forum-api.ts). */
const DEV_API_FALLBACK = "http://localhost:8787";

function getApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_JOSECODED_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    return DEV_API_FALLBACK;
  }
  return null;
}

/**
 * Token de sesión para el fetch admin — vía el cliente SSR (cookies), el
 * mismo que usa el resto de staff-dash (`dash-shell`, `assets-api`,
 * `leads-api`...). Distinto de `lib/supabase/access-token.ts`, que lee del
 * cliente localStorage (`client.ts`) usado por el terminal-chat público — la
 * consola admin vive detrás del guard de `proxy.ts` con sesión en cookies.
 */
async function getStaffAccessToken(): Promise<string | null> {
  const supabase = getSupabaseSSRBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function parseEnvelope<T>(body: unknown): ApiEnvelope<T> {
  if (!body || typeof body !== "object" || !("ok" in body)) {
    return { ok: false, error: { code: "internal_error", message: "Invalid API response" } };
  }
  return body as ApiEnvelope<T>;
}

function toFetchResult<T>(envelope: ApiEnvelope<T>): FetchResult<T> {
  if (envelope.ok) return { ok: true, data: envelope.data };
  return { ok: false, message: envelope.error.message };
}

/** Fetch autenticado contra `/api/v1/admin-chat/admin/*`, mapeado a `FetchResult` (mirror del envelope de `admin-chat-api.ts`). */
async function authedFetch<T>(path: string, init?: RequestInit): Promise<FetchResult<T>> {
  const base = getApiBase();
  if (!base) return { ok: false, message: "API not configured" };

  const token = await getStaffAccessToken();
  if (!token) return { ok: false, message: "no-session" };

  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/admin-chat/admin${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network-error" };
  }

  const body = await res.json().catch(() => null);
  return toFetchResult(parseEnvelope<T>(body));
}

export function adminChatsIsConfigured(): boolean {
  return Boolean(getApiBase());
}

/** Lista de conversaciones para la consola admin, más recientes primero (el gateway ya ordena por `last_message_at`). */
export async function listConversations(): Promise<FetchResult<AdminConversationSummaryDTO[]>> {
  return authedFetch<AdminConversationSummaryDTO[]>("/conversations");
}

/** Mensajes de una conversación (hasta 200, orden cronológico — igual que el thread público). */
export async function getMessages(
  conversationId: string,
): Promise<FetchResult<AdminChatConsoleMessageDTO[]>> {
  return authedFetch<AdminChatConsoleMessageDTO[]>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}

/** Respuesta manual del admin — `sender_role='admin'` en el gateway, NO dispara la IA. */
export async function sendAdminMessage(
  conversationId: string,
  content: string,
): Promise<FetchResult<AdminChatConsoleMessageDTO>> {
  return authedFetch<AdminChatConsoleMessageDTO>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

/** Prende/apaga la respuesta automática de la IA para una conversación puntual. */
export async function setAi(
  conversationId: string,
  enabled: boolean,
): Promise<FetchResult<{ conversationId: string; aiEnabled: boolean }>> {
  return authedFetch<{ conversationId: string; aiEnabled: boolean }>(
    `/conversations/${encodeURIComponent(conversationId)}/ai`,
    { method: "POST", body: JSON.stringify({ enabled }) },
  );
}

/** Marca la conversación como leída (limpia el badge de no-leídos en la lista). */
export async function markRead(
  conversationId: string,
): Promise<FetchResult<{ conversationId: string }>> {
  return authedFetch<{ conversationId: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST" },
  );
}
