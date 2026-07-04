import type {
  ForumCommentDTO,
  ForumEntryDetailDTO,
  ForumEntrySummaryDTO,
  ForumThematicDTO,
} from "@/lib/types";

export function forumThematicTitle(th: ForumThematicDTO, translate: (key: string) => string): string {
  const d = th.titleDisplay?.trim();
  if (d) return d;
  if (th.titleKey) return translate(th.titleKey);
  return th.slug;
}

export function forumThematicDescription(th: ForumThematicDTO, translate: (key: string) => string): string {
  const d = th.descriptionDisplay?.trim();
  if (d) return d;
  if (th.descriptionKey) return translate(th.descriptionKey);
  return "";
}

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiEnvelope<T> = ApiOk<T> | ApiFail;

/** Origen por defecto en `next dev` si no hay `NEXT_PUBLIC_JOSECODED_API_URL` (wrangler suele usar el puerto 8787). */
const DEV_FORUM_API_FALLBACK = "http://localhost:8787";

function getApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_JOSECODED_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    return DEV_FORUM_API_FALLBACK;
  }
  return null;
}

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function forumFetchThematics(): Promise<ForumThematicDTO[] | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/v1/forum/thematics`, { next: { revalidate: 30 } });
  const body = await parseJson<ForumThematicDTO[]>(res);
  if (!body.ok || !res.ok) return null;
  return body.data;
}

export async function forumFetchEntries(thematicSlug: string): Promise<ForumEntrySummaryDTO[] | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/v1/forum/thematics/${encodeURIComponent(thematicSlug)}/entries`, {
    next: { revalidate: 15 },
  });
  const body = await parseJson<ForumEntrySummaryDTO[]>(res);
  if (!body.ok || !res.ok) return null;
  return body.data;
}

export async function forumFetchPopular(limit = 8): Promise<ForumEntrySummaryDTO[] | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/v1/forum/popular?limit=${limit}`, { next: { revalidate: 30 } });
  const body = await parseJson<ForumEntrySummaryDTO[]>(res);
  if (!body.ok || !res.ok) return null;
  return body.data;
}

export async function forumFetchSearch(q: string): Promise<{ thematics: ForumThematicDTO[]; entries: ForumEntrySummaryDTO[] } | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/v1/forum/search?q=${encodeURIComponent(q)}`, { next: { revalidate: 10 } });
  const body = await parseJson<{ thematics: ForumThematicDTO[]; entries: ForumEntrySummaryDTO[] }>(res);
  if (!body.ok || !res.ok) return null;
  return body.data;
}

export async function forumFetchEntryDetail(
  thematicSlug: string,
  entrySlug: string,
  accessToken?: string | null,
): Promise<ForumEntryDetailDTO | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}`, {
    cache: "no-store",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  const body = await parseJson<ForumEntryDetailDTO>(res);
  if (!body.ok || !res.ok) return null;
  return body.data;
}

export async function forumPostJson<T>(
  path: string,
  body: unknown,
  accessToken: string,
): Promise<ApiEnvelope<T>> {
  const base = getApiBase();
  if (!base) return { ok: false, error: { code: "server_error", message: "Missing API URL" } };
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return parseJson<T>(res);
}

export async function forumPutJson<T>(path: string, body: unknown, accessToken: string): Promise<ApiEnvelope<T>> {
  const base = getApiBase();
  if (!base) return { ok: false, error: { code: "server_error", message: "Missing API URL" } };
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return parseJson<T>(res);
}

export async function forumDelete(path: string, accessToken: string): Promise<ApiEnvelope<{ deleted: boolean }>> {
  const base = getApiBase();
  if (!base) return { ok: false, error: { code: "server_error", message: "Missing API URL" } };
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseJson<{ deleted: boolean }>(res);
}

export function forumEntryTitle(entry: ForumEntrySummaryDTO, t: (key: string) => string): string {
  if (entry.titleDisplay?.trim()) return entry.titleDisplay;
  if (entry.titleKey) return t(entry.titleKey);
  return "";
}

export function forumIsApiConfigured(): boolean {
  return Boolean(getApiBase());
}

export type { ForumCommentDTO };
