"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

const THEME_STORAGE_KEY = "theme";

type Props = {
  locale: Locale;
};

/**
 * Light/dark toggle for the public nav. Reads/writes the same `localStorage`
 * key (`theme`, values `"dark" | "light"`) and `.dark` class on `<html>` that
 * the anti-FOUC init script (Fase 4a Task 2) uses, so the two stay in sync.
 *
 * Hydration-safe: initial dark/light state is unknown at SSR time (it depends
 * on `document`/`localStorage`), so we render a neutral placeholder until
 * mounted and only read the real state in `useEffect`.
 */
export function ThemeToggle({ locale }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const buttonClass =
    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-low/80 hover:text-primary hover:shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (!mounted) {
    return (
      <span className={`${buttonClass} opacity-60`} aria-hidden>
        <Sun className="size-5 sm:size-6" strokeWidth={2} />
      </span>
    );
  }

  const ariaLabel = t(locale, isDark ? "nav.themeToggleToLight" : "nav.themeToggleToDark");

  const handleClick = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage may be unavailable (private mode, disabled storage); the
      // toggle still works for the current page load.
    }
    setIsDark(next);
  };

  return (
    <button
      type="button"
      data-hover-label={ariaLabel}
      data-hover-label-placement="below"
      aria-label={ariaLabel}
      className={buttonClass}
      onClick={handleClick}
    >
      {isDark ? (
        <Moon className="size-5 sm:size-6" aria-hidden strokeWidth={2} />
      ) : (
        <Sun className="size-5 sm:size-6" aria-hidden strokeWidth={2} />
      )}
    </button>
  );
}
