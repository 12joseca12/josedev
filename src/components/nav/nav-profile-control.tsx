"use client";

import { UserCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { AuthEntryLink } from "@/components/auth/auth-entry-link";
import { displayNameFromAuthUser, initialsFromDisplayName } from "@/lib/user-initials";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Variant = "icon" | "menu";

type Props = {
  profileAria: string;
  profileAriaSignedIn: string;
  profileMenuLabel: string;
  profileMenuLabelSignedIn: string;
  variant?: Variant;
  /** Posición del tooltip `data-hover-label` (p. ej. `below` en la barra superior). */
  hoverLabelPlacement?: "below";
  onNavigate?: () => void;
};

function ProfileAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg border border-primary/45 bg-gradient-to-br from-surface-container-high to-surface-container-low font-headline text-[10px] font-bold uppercase tracking-tight text-primary shadow-[0_0_16px_color-mix(in_srgb,var(--color-primary-container)_22%,transparent)] sm:text-[11px] ${className ?? ""}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function NavProfileControlInner({
  profileAria,
  profileAriaSignedIn,
  profileMenuLabel,
  profileMenuLabelSignedIn,
  variant = "icon",
  hoverLabelPlacement,
  onNavigate,
}: Props) {
  const hoverLabelPlacementAttr = hoverLabelPlacement
    ? ({ "data-hover-label-placement": hoverLabelPlacement } as const)
    : {};
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data.user ?? null);
        setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const iconButtonClass =
    "rounded-lg p-2 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-low/80 hover:text-primary hover:shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)]";
  const menuItemClass =
    "flex items-center gap-3 rounded-lg px-3 py-3 font-headline text-sm font-medium uppercase tracking-tight text-slate-400 transition-all duration-300 hover:bg-surface-container-low hover:pl-4 hover:text-primary hover:shadow-[inset_3px_0_0_0_var(--color-primary)]";

  if (!ready) {
    if (variant === "menu") {
      return (
        <span className={`${menuItemClass} pointer-events-none opacity-60`} aria-hidden>
          <UserCircle className="size-5 shrink-0" />
          {profileMenuLabel}
        </span>
      );
    }
    return (
      <span className={`${iconButtonClass} inline-flex opacity-60`} aria-hidden>
        <UserCircle className="size-5 sm:size-6" strokeWidth={2} />
      </span>
    );
  }

  if (!user) {
    if (variant === "menu") {
      return (
        <AuthEntryLink
          data-hover-label={profileAria}
          {...hoverLabelPlacementAttr}
          aria-label={profileAria}
          className={menuItemClass}
          onClick={onNavigate}
        >
          <UserCircle className="size-5 shrink-0" aria-hidden strokeWidth={2} />
          {profileMenuLabel}
        </AuthEntryLink>
      );
    }
    return (
      <AuthEntryLink
        data-hover-label={profileAria}
        {...hoverLabelPlacementAttr}
        aria-label={profileAria}
        className={iconButtonClass}
      >
        <UserCircle className="size-5 sm:size-6" aria-hidden strokeWidth={2} />
      </AuthEntryLink>
    );
  }

  const displayName = displayNameFromAuthUser(user);
  const initials = initialsFromDisplayName(displayName);

  if (variant === "menu") {
    return (
      <Link
        href="/perfil"
        data-hover-label={profileAriaSignedIn}
        {...hoverLabelPlacementAttr}
        aria-label={profileAriaSignedIn}
        className={menuItemClass}
        onClick={onNavigate}
      >
        <ProfileAvatar initials={initials} className="size-8 sm:size-9" />
        {profileMenuLabelSignedIn}
      </Link>
    );
  }

  return (
    <Link
      href="/perfil"
      data-hover-label={profileAriaSignedIn}
      {...hoverLabelPlacementAttr}
      aria-label={profileAriaSignedIn}
      className={`${iconButtonClass} inline-flex items-center justify-center`}
    >
      <ProfileAvatar initials={initials} className="size-8 sm:size-9" />
    </Link>
  );
}

export function NavProfileControl(props: Props) {
  return (
    <Suspense fallback={null}>
      <NavProfileControlInner {...props} />
    </Suspense>
  );
}
