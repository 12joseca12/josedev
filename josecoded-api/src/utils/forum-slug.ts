/**
 * Slug tipo URL a partir del título: minúsculas, sin espacios, solo [a-z0-9] (sin guiones).
 */
export function slugFromTitleNoSpaces(title: string, maxLen: number): string {
  const n = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  const out = n.slice(0, Math.max(1, maxLen));
  return out.length >= 1 ? out : 'a';
}
