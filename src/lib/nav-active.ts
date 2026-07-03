function stripLocale(path: string): string {
  const withoutLocale = path.replace(/^\/(es|en)(?=\/|$)/, "");
  return withoutLocale || "/";
}

/** Indica si un enlace del menú principal corresponde a la ruta actual (ambos pueden llevar prefijo de locale). */
export function isNavLinkActive(href: string, pathname: string): boolean {
  const path = (stripLocale(pathname.split("?")[0] ?? "/")).replace(/\/$/, "") || "/";
  const link = stripLocale(href).replace(/\/$/, "") || "/";

  if (link === "/") {
    return path === "/";
  }

  return path === link || path.startsWith(`${link}/`);
}
