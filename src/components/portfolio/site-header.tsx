import type { Locale } from "@/lib/types";
import { localizedHref, t } from "@/services/literals";

import { SiteHeaderClient } from "./site-header-client";

type Props = {
  locale: Locale;
};

export function SiteHeader({ locale }: Props) {
  const links = [
    { href: localizedHref(locale, "/"), label: t(locale, "nav.home") },
    { href: localizedHref(locale, "/sobre-mi"), label: t(locale, "nav.sobreMi") },
    { href: localizedHref(locale, "/services"), label: t(locale, "nav.services") },
    { href: localizedHref(locale, "/blog"), label: t(locale, "nav.blog") },
    { href: localizedHref(locale, "/foro"), label: t(locale, "nav.forum") },
  ];

  return (
    <nav
      aria-label={t(locale, "nav.brand")}
      className="sticky top-0 z-50 w-full border-b border-dash-border bg-dash-bg"
    >
      <SiteHeaderClient
        locale={locale}
        brand={t(locale, "nav.brand")}
        links={links}
        profileAria={t(locale, "nav.profileAria")}
        profileAriaSignedIn={t(locale, "nav.profileAriaSignedIn")}
        profileMenuLabel={t(locale, "nav.profileLink")}
        profileMenuLabelSignedIn={t(locale, "nav.profileLinkSignedIn")}
        terminalAria={t(locale, "nav.terminalAria")}
        openMenuLabel={t(locale, "nav.openMenu")}
        closeMenuLabel={t(locale, "nav.closeMenu")}
        currentPageLabel={t(locale, "nav.currentPage")}
      />
    </nav>
  );
}
