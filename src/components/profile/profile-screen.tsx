"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { buildAuthHref } from "@/lib/auth-return-path";
import type { Locale } from "@/lib/types";
import { displayNameFromAuthUser, initialsFromDisplayName } from "@/lib/user-initials";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
};

export function ProfileScreen({ locale }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const current = data.user ?? null;
      setUser(current);
      setReady(true);
      if (!current) {
        router.replace(buildAuthHref(locale, localizedHref(locale, "/perfil")));
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(next);
      setReady(true);
      if (!next) {
        router.replace(buildAuthHref(locale, localizedHref(locale, "/perfil")));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, locale]);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace(localizedHref(locale, "/"));
    } finally {
      setSigningOut(false);
    }
  };

  if (!ready || !user) {
    return (
      <div className="mx-auto w-full max-w-lg animate-pulse rounded-2xl border border-outline-variant/25 bg-surface-container-low/40 p-8" aria-busy="true">
        <div className="mx-auto mb-4 size-16 rounded-xl bg-surface-container-high" />
        <div className="mx-auto h-6 w-40 rounded bg-surface-container-high" />
      </div>
    );
  }

  const displayName = displayNameFromAuthUser(user);
  const initials = initialsFromDisplayName(displayName);
  const email = user.email ?? "";

  return (
    <article className="mx-auto w-full max-w-lg rounded-2xl border border-outline-variant/25 bg-surface-container-low/50 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <span
          className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-gradient-to-br from-surface-container-high to-surface-container-low font-headline text-lg font-bold uppercase tracking-tight text-primary shadow-[0_0_24px_color-mix(in_srgb,var(--color-primary-container)_25%,transparent)] sm:mb-0"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
            {t(locale, "profilePage.h1")}
          </h1>
          {displayName ? (
            <p className="mt-2 truncate text-sm font-medium text-on-surface">{displayName}</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-8 space-y-4 border-t border-outline-variant/20 pt-6">
        {displayName ? (
          <div>
            <dt className="font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
              {t(locale, "profilePage.name")}
            </dt>
            <dd className="mt-1 text-sm text-on-surface">{displayName}</dd>
          </div>
        ) : null}
        {email ? (
          <div>
            <dt className="font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
              {t(locale, "profilePage.email")}
            </dt>
            <dd className="mt-1 break-all text-sm text-on-surface">{email}</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        disabled={signingOut}
        data-hover-label={t(locale, "profilePage.signOut")}
        aria-label={t(locale, "profilePage.signOutAria")}
        onClick={() => void onSignOut()}
        className="mt-8 w-full rounded-xl border border-outline-variant/35 bg-surface-container-high px-4 py-3 font-headline text-xs font-bold uppercase tracking-tight text-on-surface-variant transition-colors hover:border-error/35 hover:text-error disabled:opacity-60"
      >
        {signingOut ? t(locale, "profilePage.signingOut") : t(locale, "profilePage.signOut")}
      </button>
    </article>
  );
}
