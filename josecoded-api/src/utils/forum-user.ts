import type { User } from '@supabase/supabase-js';

/** Nombre legible para UI (no usar en RLS; solo etiqueta). */
export function forumAuthorDisplayFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const pick = (k: string) => {
    const v = meta?.[k];
    return typeof v === 'string' ? v.trim() : '';
  };
  const fromMeta =
    pick('full_name') || pick('name') || pick('display_name') || pick('preferred_username');
  if (fromMeta) return fromMeta.slice(0, 120);
  const email = user.email?.split('@')[0]?.trim();
  if (email) return email.slice(0, 120);
  return 'Member';
}
