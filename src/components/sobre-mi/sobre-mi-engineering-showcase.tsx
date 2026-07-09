"use client";

import { ExternalLink, Loader2 } from "lucide-react";

import { CATINFO_SHOWCASE_TECH } from "@/lib/catinfo-showcase-config";
import type { Locale } from "@/lib/types";
import { useEmulatorDemo } from "@/hooks/use-emulator-demo";
import { t } from "@/services/literals";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

import { AndroidEmulatorView } from "./android-emulator-view";
import { PhoneDeviceFrame } from "./phone-device-frame";
import { SobreMiTechIcon } from "./sobre-mi-tech-icon";
import { ThreeCatinfoAppPreview } from "./three-catinfo-app-preview";

type Props = {
  locale: Locale;
  sourceUrl: string | null;
};

export function SobreMiEngineeringShowcase({ locale, sourceUrl }: Props) {
  const {
    error,
    statusMessage,
    isEmulatorActive,
    isPreparingEmulator,
    viewerUrl,
    showPreview,
    startLiveDemo,
  } =
    useEmulatorDemo(locale);

  const headingId = "sobre-mi-engineering-showcase";
  const phoneLabel = isEmulatorActive
    ? t(locale, "sobreMiShowcase.catinfo.phoneEmulatorAria")
    : t(locale, "sobreMiShowcase.catinfo.phonePreviewAria");
  const revealRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={revealRef}
      className="relative mt-16 border-t border-dash-border pt-14 sm:mt-20 sm:pt-16"
      aria-labelledby={headingId}
    >
      <header className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mb-10">
        <span className="font-dash-mono text-sm font-bold tabular-nums text-dash-accent-text sm:text-base">
          {t(locale, "sobreMiShowcase.index")}
        </span>
        <span className="font-dash-mono text-sm text-dash-muted sm:text-base" aria-hidden="true">
          {"//"}
        </span>
        <h2
          id={headingId}
          className="font-headline text-sm font-extrabold uppercase tracking-wide text-dash-text sm:text-base"
        >
          {t(locale, "sobreMiShowcase.title")}
        </h2>
      </header>

      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <div className="order-1 lg:order-none">
          <PhoneDeviceFrame label={phoneLabel}>
            <div className="relative h-full w-full">
              {isEmulatorActive && viewerUrl ? (
                <AndroidEmulatorView
                  viewerUrl={viewerUrl}
                  title={t(locale, "sobreMiShowcase.catinfo.emulatorIframeTitle")}
                />
              ) : (
                <ThreeCatinfoAppPreview locale={locale} />
              )}
              {isPreparingEmulator ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dash-bg/85 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-8 animate-spin text-dash-accent-text" aria-hidden />
                  <p className="max-w-[12rem] text-center font-dash-mono text-[10px] uppercase tracking-widest text-dash-muted">
                    {statusMessage ?? t(locale, "sobreMiShowcase.catinfo.liveDemoLoading")}
                  </p>
                </div>
              ) : null}
            </div>
          </PhoneDeviceFrame>
          {isEmulatorActive ? (
            <p className="mt-3 text-center">
              <button
                type="button"
                onClick={showPreview}
                className="font-dash-mono text-[10px] uppercase tracking-widest text-dash-accent-text underline-offset-4 hover:underline"
              >
                {t(locale, "sobreMiShowcase.catinfo.backToPreview")}
              </button>
            </p>
          ) : null}
        </div>

        <div className="order-2 min-w-0 lg:order-none">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-dash-text sm:text-4xl">
            {t(locale, "sobreMiShowcase.catinfo.name")}
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-dash-muted sm:text-base">
            {t(locale, "sobreMiShowcase.catinfo.description")}
          </p>

          <p className="mt-8 font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
            {t(locale, "sobreMiShowcase.catinfo.techSpecsLabel")}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            {CATINFO_SHOWCASE_TECH.map((tech) => (
              <li
                key={tech}
                className="flex items-center gap-3 rounded-md border border-dash-border bg-dash-surface px-3 py-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-dash-border bg-dash-bg">
                  <SobreMiTechIcon tech={tech} sizeClass="size-5" />
                </span>
                <span className="font-headline text-[11px] font-bold uppercase tracking-wide text-dash-text sm:text-xs">
                  {t(locale, `sobreMiStack.tech.${tech}.name`)}
                </span>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="mt-4 rounded-sm border border-dash-error/30 bg-dash-error/10 px-3 py-2 font-dash-mono text-xs text-dash-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-dash-border bg-transparent px-5 py-3 font-headline text-xs font-bold uppercase tracking-wide text-dash-text transition-colors hover:border-dash-accent hover:text-dash-accent-text sm:flex-none sm:px-6"
              >
                {t(locale, "sobreMiShowcase.catinfo.viewSource")}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void startLiveDemo()}
              disabled={isPreparingEmulator}
              aria-busy={isPreparingEmulator}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border-2 border-dash-accent bg-dash-accent px-5 py-3 font-headline text-xs font-bold uppercase tracking-wide text-dash-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
            >
              {isPreparingEmulator
                ? t(locale, "sobreMiShowcase.catinfo.liveDemoLoadingShort")
                : t(locale, "sobreMiShowcase.catinfo.liveDemo")}
            </button>
          </div>
          <p className="mt-3 font-dash-mono text-[10px] leading-relaxed text-dash-muted">
            {t(locale, "sobreMiShowcase.catinfo.liveDemoHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
