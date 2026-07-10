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
      <div className="mx-auto w-full max-w-lg animate-pulse rounded-lg border border-dash-border bg-dash-surface p-8 motion-reduce:animate-none" aria-busy="true">
        <div className="mx-auto mb-4 size-16 rounded-lg bg-dash-bg" />
        <div className="mx-auto h-6 w-40 rounded bg-dash-bg" />
      </div>
    );
  }

  const displayName = displayNameFromAuthUser(user);
  const initials = initialsFromDisplayName(displayName);
  const email = user.email ?? "";

  return (
    <article className="mx-auto w-full max-w-lg rounded-lg border border-dash-border bg-dash-surface p-6 sm:p-8">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <span
          className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-lg border border-dash-accent/45 bg-dash-bg font-headline text-lg font-bold uppercase tracking-tight text-dash-accent-text sm:mb-0"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-dash-text sm:text-3xl">
            {t(locale, "profilePage.h1")}
          </h1>
          {displayName ? <p className="mt-2 truncate text-sm font-medium text-dash-text">{displayName}</p> : null}
        </div>
      </div>

      <dl className="mt-8 space-y-4 border-t border-dash-border pt-6">
        {displayName ? (
          <div>
            <dt className="font-label text-[10px] font-medium uppercase tracking-widest text-dash-muted">
              {t(locale, "profilePage.name")}
            </dt>
            <dd className="mt-1 text-sm text-dash-text">{displayName}</dd>
          </div>
        ) : null}
        {email ? (
          <div>
            <dt className="font-label text-[10px] font-medium uppercase tracking-widest text-dash-muted">
              {t(locale, "profilePage.email")}
            </dt>
            <dd className="mt-1 break-all text-sm text-dash-text">{email}</dd>
          </div>
        ) : null}
      </dl>

      <button
        type="button"
        disabled={signingOut}
        data-hover-label={t(locale, "profilePage.signOut")}
        aria-label={t(locale, "profilePage.signOutAria")}
        onClick={() => void onSignOut()}
        className="mt-8 w-full rounded-md border border-dash-border bg-dash-bg px-4 py-3 font-headline text-xs font-bold uppercase tracking-tight text-dash-muted transition-colors hover:border-dash-error/40 hover:text-dash-error disabled:opacity-60"
      >
        {signingOut ? t(locale, "profilePage.signingOut") : t(locale, "profilePage.signOut")}
      </button>
    </article>
  );
}
