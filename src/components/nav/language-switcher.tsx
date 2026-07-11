"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/types";
import { SUPPORTED_LOCALES, t } from "@/services/literals";

type Props = {
  locale: Locale;
};

function pathForLocale(pathname: string, targetLocale: Locale): string {
  const rest = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
  return `/${targetLocale}${rest === "/" ? "" : rest}`;
}

export function LanguageSwitcher({ locale }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div
      role="group"
      aria-label={t(locale, "nav.languageSwitcherAria")}
      className="flex shrink-0 items-center rounded-md border border-dash-border font-dash-mono text-[10px] font-bold uppercase tracking-wide"
    >
      {SUPPORTED_LOCALES.map((candidate, index) => {
        const active = candidate === locale;
        const href = `${pathForLocale(pathname, candidate)}${query ? `?${query}` : ""}`;
        return (
          <Link
            key={candidate}
            href={href}
            aria-current={active ? "true" : undefined}
            className={`px-2 py-1 transition-colors ${index === 0 ? "rounded-l-md" : "rounded-r-md border-l border-dash-border"} ${
              active
                ? "bg-dash-accent/15 text-dash-accent-text"
                : "text-dash-muted hover:bg-dash-border/40 hover:text-dash-accent-text"
            }`}
          >
            {candidate}
          </Link>
        );
      })}
    </div>
  );
}
