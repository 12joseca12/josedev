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
        className="group flex min-h-[7.5rem] flex-col items-center justify-center rounded-md border border-dash-border bg-dash-surface px-3 py-4 text-center transition-colors duration-200 hover:border-dash-accent sm:min-h-[8.5rem] sm:px-4"
        aria-labelledby={`sobre-mi-tech-${tech}`}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-sm border border-dash-border bg-dash-bg text-dash-text sm:size-14">
          <SobreMiTechIcon tech={tech} sizeClass="size-7 sm:size-8" />
        </div>
        <h3
          id={`sobre-mi-tech-${tech}`}
          className="font-headline text-[11px] font-bold uppercase tracking-wide text-dash-text sm:text-xs"
        >
          {name}
        </h3>
        <p className="mt-1 font-dash-mono text-[9px] uppercase tracking-widest text-dash-muted sm:text-[10px]">{tag}</p>
      </article>
    );
  }

  const description = t(locale, `sobreMiStack.tech.${tech}.description`);

  return (
    <article
      className="flex h-full min-h-[16rem] flex-col rounded-md border border-dash-border bg-dash-surface p-5 sm:min-h-[18rem] sm:p-6 lg:p-7"
      aria-labelledby={`sobre-mi-tech-${tech}-primary`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-sm border border-dash-border bg-dash-bg sm:size-16">
        <SobreMiTechIcon tech={tech} sizeClass="size-9 sm:size-10" />
      </div>
      <h3
        id={`sobre-mi-tech-${tech}-primary`}
        className="font-headline text-lg font-extrabold uppercase tracking-tight text-dash-text sm:text-xl"
      >
        {name}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-dash-muted sm:text-[0.9375rem]">
        {description}
      </p>
      <ul className="mt-5 flex flex-wrap gap-3 border-t border-dash-border pt-4" aria-label={t(locale, "sobreMiStack.primaryBadgesAria")}>
        {props.badgeTechs.map((badge) => (
          <li key={badge} className="list-none">
            <span className="flex size-9 items-center justify-center rounded-sm border border-dash-border bg-dash-bg">
              <SobreMiTechIcon tech={badge} sizeClass="size-5" />
              <span className="sr-only">{techName(locale, badge)}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
