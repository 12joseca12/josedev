import { SOBRE_MI_CATEGORY_ORDER } from "@/lib/sobre-mi-stack-config";
import type { Locale } from "@/lib/types";

import { SobreMiCategoryBlock } from "./sobre-mi-category-block";
import { SobreMiStackHero } from "./sobre-mi-stack-hero";

type Props = {
  locale: Locale;
};

export function SobreMiStackPortfolio({ locale }: Props) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-primary/[0.06] blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-tertiary/[0.05] blur-[110px]"
        aria-hidden
      />

      <div className="relative z-10">
        <SobreMiStackHero locale={locale} />
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-14 xl:gap-x-10">
          {SOBRE_MI_CATEGORY_ORDER.map((category) => (
            <SobreMiCategoryBlock key={category} locale={locale} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
