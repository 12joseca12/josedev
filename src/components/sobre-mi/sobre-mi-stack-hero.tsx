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
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary sm:text-xs">
            {t(locale, "sobreMiStack.hero.eyebrow")}
          </p>
          <h1 className="mt-3 font-headline text-3xl font-extrabold uppercase leading-[1.05] tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
            {t(locale, "sobreMiStack.hero.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {t(locale, "sobreMiStack.hero.subtitle")}
          </p>
        </div>
        <p
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-tertiary/30 bg-tertiary/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-tertiary sm:text-xs"
          role="status"
        >
          <span className="size-2 rounded-full bg-tertiary shadow-[0_0_10px_color-mix(in_srgb,var(--color-tertiary-fixed)_50%,transparent)]" aria-hidden />
          {t(locale, "sobreMiStack.hero.badge")}
        </p>
      </div>
    </header>
  );
}
