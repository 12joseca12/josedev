import type { Locale } from "@/lib/types";
import { styleTokens } from "@/lib/stylesVariables";
import { t } from "@/services/literals";

import { SiteHeaderClient } from "./site-header-client";

type Props = {
  locale: Locale;
};

export function SiteHeader({ locale }: Props) {
  const links = [
    { href: "#main", label: t(locale, "nav.home") },
    { href: "#services", label: t(locale, "nav.services") },
    { href: "#blog", label: t(locale, "nav.blog") },
  ];

  return (
    <nav
      aria-label={t(locale, "nav.brand")}
      className="sticky top-0 z-50 w-full bg-gradient-to-b from-background/80 to-transparent backdrop-blur-lg"
      style={{ boxShadow: styleTokens.layout.navShadow }}
    >
      <SiteHeaderClient
        brand={t(locale, "nav.brand")}
        links={links}
        profileAria={t(locale, "nav.profileAria")}
        profileMenuLabel={t(locale, "nav.profileLink")}
        terminalAria={t(locale, "nav.terminalAria")}
        hireMe={t(locale, "nav.hireMe")}
        openMenuLabel={t(locale, "nav.openMenu")}
        closeMenuLabel={t(locale, "nav.closeMenu")}
      />
    </nav>
  );
}
