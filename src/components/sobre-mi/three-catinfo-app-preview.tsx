import { Bell, Search } from "lucide-react";

import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const TABS = ["news", "categories", "newsId", "favorites"] as const;

const MOCK_ARTICLES = ["article1", "article2", "article3"] as const;

/**
 * Device screen mockup — a "real" element like the terminal widget. Its
 * surfaces (`app-preview-*`) are fixed device-hardware literals, independent
 * of the site's light/dark toggle, so text/border colors here are also fixed
 * on-dark literals (not `dash-*`, which flip with theme and would break
 * contrast against this permanently-dark screen).
 */
export function ThreeCatinfoAppPreview({ locale }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-app-preview-surface text-white/90">
      <header className="flex shrink-0 items-center justify-between bg-app-preview-accent px-3 py-2.5 pt-6">
        <span className="font-headline text-sm font-bold tracking-tight text-app-preview-surface-deep">
          {t(locale, "sobreMiShowcase.catinfo.preview.appName")}
        </span>
        <Bell className="size-4 text-app-preview-surface-deep/80" aria-hidden strokeWidth={2} />
      </header>

      <div className="shrink-0 px-3 py-2">
        <label className="relative flex items-center">
          <span className="sr-only">{t(locale, "sobreMiShowcase.catinfo.preview.searchLabel")}</span>
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-white/50" aria-hidden />
          <span className="block w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-8 pr-2 font-dash-mono text-[10px] text-white/50">
            {t(locale, "sobreMiShowcase.catinfo.preview.searchPlaceholder")}
          </span>
        </label>
      </div>

      <nav
        className="flex shrink-0 gap-3 overflow-x-auto border-b border-white/10 px-3 pb-0 text-[9px] font-semibold uppercase tracking-wide text-white/50"
        aria-label={t(locale, "sobreMiShowcase.catinfo.preview.tabsAria")}
      >
        {TABS.map((tab) => (
          <span
            key={tab}
            className={`shrink-0 border-b-2 pb-2 ${
              tab === "news"
                ? "border-app-preview-accent text-white/90"
                : "border-transparent text-white/50"
            }`}
          >
            {t(locale, `sobreMiShowcase.catinfo.preview.tabs.${tab}`)}
          </span>
        ))}
      </nav>

      <ul className="min-h-0 flex-1 space-y-2 overflow-hidden px-3 py-2" aria-label={t(locale, "sobreMiShowcase.catinfo.preview.feedAria")}>
        {MOCK_ARTICLES.map((key) => (
          <li
            key={key}
            className="flex gap-2 rounded-lg border border-white/10 bg-white/5 p-2"
          >
            <div
              className="size-12 shrink-0 rounded-md bg-app-preview-accent/20"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-dash-mono text-[9px] leading-snug text-white/90">
                {t(locale, `sobreMiShowcase.catinfo.preview.articles.${key}.title`)}
              </p>
              <p className="mt-1 font-dash-mono text-[8px] uppercase tracking-widest text-app-preview-accent">
                {t(locale, `sobreMiShowcase.catinfo.preview.articles.${key}.tag`)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <footer
        className="flex shrink-0 justify-around border-t border-white/10 bg-app-preview-surface-dim px-2 py-2"
        aria-hidden
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="size-4 rounded bg-white/10" />
        ))}
      </footer>
    </div>
  );
}
