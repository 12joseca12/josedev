"use client";

import { ExternalLink, Loader2 } from "lucide-react";

import { CATINFO_SHOWCASE_TECH } from "@/lib/catinfo-showcase-config";
import type { Locale } from "@/lib/types";
import { useEmulatorDemo } from "@/hooks/use-emulator-demo";
import { t } from "@/services/literals";

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

  return (
    <section
      className="relative mt-16 border-t border-outline-variant/25 pt-14 sm:mt-20 sm:pt-16"
      aria-labelledby={headingId}
    >
      <header className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mb-10">
        <span className="font-mono text-sm font-bold tabular-nums text-primary sm:text-base">
          {t(locale, "sobreMiShowcase.index")}
        </span>
        <span className="font-mono text-sm text-outline sm:text-base" aria-hidden="true">
          {"//"}
        </span>
        <h2
          id={headingId}
          className="font-headline text-sm font-extrabold uppercase tracking-wide text-on-surface sm:text-base"
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
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                  <p className="max-w-[12rem] text-center font-mono text-[10px] uppercase tracking-widest text-outline">
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
                className="font-mono text-[10px] uppercase tracking-widest text-primary underline-offset-4 hover:underline"
              >
                {t(locale, "sobreMiShowcase.catinfo.backToPreview")}
              </button>
            </p>
          ) : null}
        </div>

        <div className="order-2 min-w-0 lg:order-none">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
            {t(locale, "sobreMiShowcase.catinfo.name")}
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {t(locale, "sobreMiShowcase.catinfo.description")}
          </p>

          <p className="mt-8 font-label text-[10px] uppercase tracking-widest text-outline">
            {t(locale, "sobreMiShowcase.catinfo.techSpecsLabel")}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            {CATINFO_SHOWCASE_TECH.map((tech) => (
              <li
                key={tech}
                className="flex items-center gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-low/40 px-3 py-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-lowest/80">
                  <SobreMiTechIcon tech={tech} sizeClass="size-5" />
                </span>
                <span className="font-headline text-[11px] font-bold uppercase tracking-wide text-on-surface sm:text-xs">
                  {t(locale, `sobreMiStack.tech.${tech}.name`)}
                </span>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="mt-4 rounded-lg border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-transparent px-5 py-3 font-headline text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10 sm:flex-none sm:px-6"
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
              className="signature-glow inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-5 py-3 font-headline text-xs font-bold uppercase tracking-wide text-on-primary-fixed shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
            >
              {isPreparingEmulator
                ? t(locale, "sobreMiShowcase.catinfo.liveDemoLoadingShort")
                : t(locale, "sobreMiShowcase.catinfo.liveDemo")}
            </button>
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-outline">
            {t(locale, "sobreMiShowcase.catinfo.liveDemoHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
