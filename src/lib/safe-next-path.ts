/**
 * Evita redirecciones abiertas: solo rutas internas relativas (`/ruta`).
 */
export function sanitizeInternalNextPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  let v: string;
  try {
    v = decodeURIComponent(raw.trim());
  } catch {
    return null;
  }
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  if (v.includes("\\") || v.includes("\n") || v.includes("\r")) return null;
  if (v.length > 2048) return null;
  return v;
}
