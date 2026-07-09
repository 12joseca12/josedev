import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

export function SobreMiStackHero({ locale }: Props) {
  return (
    <header className="relative mb-10 sm:mb-12 lg:mb-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-dash-sans text-[10px] uppercase tracking-[0.2em] text-dash-accent-text sm:text-xs">
            {t(locale, "sobreMiStack.hero.eyebrow")}
          </p>
          <h1 className="mt-3 font-headline text-3xl font-extrabold uppercase leading-[1.15] tracking-tight text-dash-text sm:text-4xl lg:text-5xl">
            {t(locale, "sobreMiStack.hero.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dash-muted sm:text-base">
            {t(locale, "sobreMiStack.hero.subtitle")}
          </p>
        </div>
        <p
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-dash-accent/30 bg-dash-accent/10 px-4 py-2 font-dash-mono text-[10px] font-semibold uppercase tracking-widest text-dash-accent-text sm:text-xs"
          role="status"
        >
          <span className="size-2 rounded-full bg-dash-accent" aria-hidden />
          {t(locale, "sobreMiStack.hero.badge")}
        </p>
      </div>
    </header>
  );
}
