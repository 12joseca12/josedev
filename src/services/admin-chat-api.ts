import type { AdminChatMessageDTO, AdminChatThreadDTO } from "@/lib/types";

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiEnvelope<T> = ApiOk<T> | ApiFail;

const DEV_API_FALLBACK = "http://localhost:8787";

function getApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_JOSECODED_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    return DEV_API_FALLBACK;
  }
  return null;
}

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export function adminChatIsConfigured(): boolean {
  return Boolean(getApiBase());
}

export async function adminChatFetchThread(accessToken: string): Promise<ApiEnvelope<AdminChatThreadDTO>> {
  const base = getApiBase();
  if (!base) return { ok: false, error: { code: "internal_error", message: "API not configured" } };
  const res = await fetch(`${base}/api/v1/admin-chat/thread`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return parseJson<AdminChatThreadDTO>(res);
}

export async function adminChatSendMessage(
  accessToken: string,
  content: string,
): Promise<ApiEnvelope<{ userMessage: AdminChatMessageDTO; thread: AdminChatThreadDTO }>> {
  const base = getApiBase();
  if (!base) return { ok: false, error: { code: "internal_error", message: "API not configured" } };
  const res = await fetch(`${base}/api/v1/admin-chat/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  return parseJson<{ userMessage: AdminChatMessageDTO; thread: AdminChatThreadDTO }>(res);
}

export async function adminChatScheduleMeeting(
  accessToken: string,
  body: { conversationId: string; messageId: string; date: string; time: string },
): Promise<ApiEnvelope<{ thread: AdminChatThreadDTO }>> {
  const base = getApiBase();
  if (!base) return { ok: false, error: { code: "internal_error", message: "API not configured" } };
  const res = await fetch(`${base}/api/v1/admin-chat/meeting`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseJson<{ thread: AdminChatThreadDTO }>(res);
}
