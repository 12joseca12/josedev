import type { IconType } from "react-icons";
import { FaEnvelope, FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const social: {
  href: string;
  labelKey: "footer.github" | "footer.linkedin" | "footer.twitter" | "footer.email";
  Icon: IconType;
}[] = [
  { href: "https://github.com", labelKey: "footer.github", Icon: FaGithub },
  { href: "https://linkedin.com", labelKey: "footer.linkedin", Icon: FaLinkedin },
  { href: "https://twitter.com", labelKey: "footer.twitter", Icon: FaXTwitter },
  { href: "mailto:hello@example.com", labelKey: "footer.email", Icon: FaEnvelope },
];

export function SiteFooter({ locale }: Props) {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-background">
      <div className="mx-auto flex max-w-[90rem] flex-col items-center justify-between gap-8 px-4 py-10 sm:gap-6 sm:px-6 md:flex-row md:py-12 lg:px-8">
        <div className="text-center font-headline text-sm font-bold text-primary-container sm:text-left md:text-base">
          {t(locale, "footer.brand")}
        </div>
        <nav
          aria-label={t(locale, "footer.socialNav")}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-body text-[10px] uppercase tracking-[0.05em] text-slate-500 sm:gap-8"
        >
          {social.map(({ href, labelKey, Icon }) => (
            <a
              key={labelKey}
              data-hover-label={t(locale, labelKey)}
              className="inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:text-primary"
              href={href}
              rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
              target={href.startsWith("mailto") ? undefined : "_blank"}
            >
              <Icon className="size-3.5 shrink-0 sm:size-4" aria-hidden />
              <span>{t(locale, labelKey)}</span>
            </a>
          ))}
        </nav>
        <p className="max-w-[20rem] text-center font-body text-[9px] uppercase leading-relaxed tracking-[0.05em] text-slate-500 sm:max-w-none sm:text-[10px] md:text-right">
          {t(locale, "footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
