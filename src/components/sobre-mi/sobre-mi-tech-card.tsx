import type { Locale, SobreMiTechKey } from "@/lib/types";
import { t } from "@/services/literals";

import { SobreMiTechIcon } from "./sobre-mi-tech-icon";

type BaseProps = {
  locale: Locale;
  tech: SobreMiTechKey;
};

type PrimaryProps = BaseProps & {
  variant: "primary";
  badgeTechs: readonly SobreMiTechKey[];
};

type DetailProps = BaseProps & {
  variant: "detail";
};

type Props = PrimaryProps | DetailProps;

function techName(locale: Locale, tech: SobreMiTechKey) {
  return t(locale, `sobreMiStack.tech.${tech}.name`);
}

export function SobreMiTechCard(props: Props) {
  const { locale, tech, variant } = props;
  const name = techName(locale, tech);
  const tag = t(locale, `sobreMiStack.tech.${tech}.tag`);

  if (variant === "detail") {
    return (
      <article
        className="group flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-container-low/50 px-3 py-4 text-center transition-colors duration-300 hover:border-primary/35 hover:bg-surface-container-low/80 focus-within:border-primary/40 sm:min-h-[8.5rem] sm:px-4"
        aria-labelledby={`sobre-mi-tech-${tech}`}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-lowest/80 text-on-surface transition-shadow group-hover:shadow-[0_0_24px_color-mix(in_srgb,var(--color-primary-container)_12%,transparent)] sm:size-14">
          <SobreMiTechIcon tech={tech} sizeClass="size-7 sm:size-8" />
        </div>
        <h3
          id={`sobre-mi-tech-${tech}`}
          className="font-headline text-[11px] font-bold uppercase tracking-wide text-on-surface sm:text-xs"
        >
          {name}
        </h3>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-outline sm:text-[10px]">{tag}</p>
      </article>
    );
  }

  const description = t(locale, `sobreMiStack.tech.${tech}.description`);

  return (
    <article
      className="flex h-full min-h-[16rem] flex-col rounded-2xl border border-outline-variant/30 bg-[rgba(12,14,17,0.85)] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] sm:min-h-[18rem] sm:p-6 lg:p-7"
      aria-labelledby={`sobre-mi-tech-${tech}-primary`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-container-lowest/60 sm:size-16">
        <SobreMiTechIcon tech={tech} sizeClass="size-9 sm:size-10" />
      </div>
      <h3
        id={`sobre-mi-tech-${tech}-primary`}
        className="font-headline text-lg font-extrabold uppercase tracking-tight text-on-surface sm:text-xl"
      >
        {name}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-on-surface-variant sm:text-[0.9375rem]">
        {description}
      </p>
      <ul className="mt-5 flex flex-wrap gap-3 border-t border-outline-variant/20 pt-4" aria-label={t(locale, "sobreMiStack.primaryBadgesAria")}>
        {props.badgeTechs.map((badge) => (
          <li key={badge} className="list-none">
            <span className="flex size-9 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-low/60">
              <SobreMiTechIcon tech={badge} sizeClass="size-5" />
              <span className="sr-only">{techName(locale, badge)}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
