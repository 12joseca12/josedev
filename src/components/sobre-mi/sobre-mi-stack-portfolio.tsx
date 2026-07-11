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
      <SobreMiStackHero locale={locale} />
      <div className="grid gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-14 xl:gap-x-10">
        {SOBRE_MI_CATEGORY_ORDER.map((category) => (
          <SobreMiCategoryBlock key={category} locale={locale} category={category} />
        ))}
      </div>
    </div>
  );
}
