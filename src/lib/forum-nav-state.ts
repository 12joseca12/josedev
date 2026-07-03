/** Slug de temática activa según la ruta `/foro/[slug]` o `/foro/[slug]/[entry]` (con o sin prefijo de locale). */
export function resolveActiveThematicSlug(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const withoutLocale = parts[0] === "es" || parts[0] === "en" ? parts.slice(1) : parts;
  if (withoutLocale[0] !== "foro") return null;
  const seg = withoutLocale[1];
  if (!seg || seg === "new") return null;
  return seg;
}

/** Asegura que la temática activa permanezca expandida en el árbol lateral. */
export function syncExpandedWithActive(expanded: ReadonlySet<string>, activeSlug: string | null): Set<string> {
  if (!activeSlug || expanded.has(activeSlug)) return new Set(expanded);
  return new Set([...expanded, activeSlug]);
}

/** Alterna expansión de una carpeta (incluida la temática activa). */
export function toggleExpandedSlug(expanded: ReadonlySet<string>, slug: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(slug)) {
    next.delete(slug);
  } else {
    next.add(slug);
  }
  return next;
}
