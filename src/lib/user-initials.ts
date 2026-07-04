/** Extrae hasta 2 iniciales legibles desde nombre o email. */
export function initialsFromDisplayName(displayName: string | null | undefined): string {
  const raw = displayName?.trim() ?? "";
  if (!raw) return "?";

  if (raw.includes("@")) {
    const local = raw.split("@")[0]?.trim() ?? "";
    if (!local) return "?";
    const parts = local.split(/[._\-\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }

  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

export function displayNameFromAuthUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  if (name) return name;
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (fullName) return fullName;
  return user.email?.trim() ?? "";
}

const TERMINAL_HOST_FALLBACK = "guest";

/** Slug de host para prompts tipo `user@host:~$` a partir del perfil Auth. */
export function terminalHostFromAuthUser(
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
): string {
  if (!user) return TERMINAL_HOST_FALLBACK;

  const display = displayNameFromAuthUser(user).trim();
  if (!display) return TERMINAL_HOST_FALLBACK;

  const source = display.includes("@")
    ? (display.split("@")[0]?.trim() ?? display)
    : (display.split(/\s+/).filter(Boolean)[0] ?? display);

  const slug = source
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);

  const host = slug.split(".")[0] ?? slug;
  return host || TERMINAL_HOST_FALLBACK;
}

export function formatTerminalPromptTemplate(template: string, host: string): string {
  return template.replaceAll("{host}", host);
}
