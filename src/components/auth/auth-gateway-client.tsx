"use client";

import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { useId, useState } from "react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

type Mode = "login" | "register";

const fieldClass =
  "w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25";

const labelClass =
  "mb-1.5 block font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant";

export function AuthGatewayClient({ locale }: Props) {
  const baseId = useId();
  const [mode, setMode] = useState<Mode>("login");

  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="relative z-10 grid w-full max-w-[1100px] overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-container-lowest/85 shadow-[0_40px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-surface-container-low/45 p-10 lg:flex lg:p-12">
          <svg className="auth-circuit-svg z-0" viewBox="0 0 520 640" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <path
              className="auth-circuit-path--cyan"
              d="M-20 120 H180 V40 H360 V200 H520 M40 260 H280 V420 H460 M120 520 H420 V300 H200"
            />
            <path
              className="auth-circuit-path--mint"
              d="M60 -10 V160 H320 V340 H80 V520 H520 M200 80 H440 V240 H260 V500"
            />
            <circle className="auth-circuit-node" cx="180" cy="120" r="3" />
            <circle className="auth-circuit-node--delayed" cx="360" cy="200" r="2.5" />
            <circle className="auth-circuit-node" cx="280" cy="420" r="2.5" />
            <circle className="auth-circuit-node--delayed" cx="120" cy="520" r="3" />
            <circle className="auth-circuit-node" cx="440" cy="240" r="2" />
          </svg>
          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-container shadow-[0_0_20px_rgba(0,229,255,0.35)]">
                <Terminal className="size-5 text-on-primary-fixed" aria-hidden strokeWidth={2.25} />
              </span>
              <span className="font-headline text-xl font-extrabold tracking-tighter text-on-surface">
                {t(locale, "nav.brand")}
              </span>
            </div>
            <h1 className="mb-5 font-headline text-4xl font-bold leading-[1.1] tracking-tight text-primary xl:text-5xl">
              {t(locale, "auth.brandPanelTitle")}
            </h1>
            <p className="max-w-sm text-sm font-light leading-relaxed text-on-surface-variant">
              {t(locale, "auth.brandPanelSubtitle")}
            </p>
          </div>
          <div className="relative z-10 mt-10 space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-outline-variant/40" />
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
                {t(locale, "auth.eyebrow")}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="size-2 animate-pulse rounded-full bg-tertiary shadow-[0_0_8px_rgba(161,255,220,0.45)]" />
              <span className="size-2 rounded-full bg-tertiary/30" />
              <span className="size-2 rounded-full bg-tertiary/30" />
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-[120%] w-[120%] translate-x-1/4 translate-y-1/4 opacity-[0.12]"
            aria-hidden
          >
            <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/30 via-transparent to-tertiary/20 blur-3xl" />
          </div>
        </section>

        <section className="relative flex flex-col justify-center bg-surface-container p-6 sm:p-10 md:p-14">
          <div className="mx-auto w-full max-w-md">
            <h2 className="sr-only">
              {mode === "login" ? t(locale, "auth.loginTitle") : t(locale, "auth.registerTitle")}
            </h2>

            <div
              role="tablist"
              aria-label={t(locale, "auth.tabsListAria")}
              className="mb-8 grid grid-cols-2 gap-2"
            >
              <button
                type="button"
                role="tab"
                id={`${baseId}-tab-login`}
                aria-selected={mode === "login"}
                aria-controls={`${baseId}-panel-login`}
                data-hover-label={t(locale, "auth.loginTab")}
                className={`rounded-xl border px-3 py-2.5 font-headline text-xs font-bold uppercase tracking-tight transition-all sm:text-sm ${
                  mode === "login"
                    ? "border-primary/40 bg-surface-container-high text-on-surface shadow-[0_0_24px_rgba(0,229,255,0.12)]"
                    : "border-outline-variant/25 bg-surface-container-low/40 text-on-surface-variant hover:border-outline-variant/45"
                }`}
                onClick={() => setMode("login")}
              >
                {t(locale, "auth.loginTab")}
              </button>
              <button
                type="button"
                role="tab"
                id={`${baseId}-tab-register`}
                aria-selected={mode === "register"}
                aria-controls={`${baseId}-panel-register`}
                data-hover-label={t(locale, "auth.registerTab")}
                className={`rounded-xl border px-3 py-2.5 font-headline text-xs font-bold uppercase tracking-tight transition-all sm:text-sm ${
                  mode === "register"
                    ? "border-primary/40 bg-surface-container-high text-on-surface shadow-[0_0_24px_rgba(0,229,255,0.12)]"
                    : "border-outline-variant/25 bg-surface-container-low/40 text-on-surface-variant hover:border-outline-variant/45"
                }`}
                onClick={() => setMode("register")}
              >
                {t(locale, "auth.registerTab")}
              </button>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t(locale, "auth.socialSoon")}
                data-hover-label={t(locale, "auth.google")}
                className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/25 bg-surface-container-low py-3 text-sm font-medium text-on-surface opacity-60 transition-colors hover:border-primary/30 hover:bg-surface-container-high disabled:cursor-not-allowed disabled:hover:border-outline-variant/25 disabled:hover:bg-surface-container-low"
              >
                <span className="font-headline text-sm font-bold opacity-80" aria-hidden>
                  G
                </span>
                {t(locale, "auth.google")}
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t(locale, "auth.socialSoon")}
                data-hover-label={t(locale, "auth.github")}
                className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/25 bg-surface-container-low py-3 text-sm font-medium text-on-surface opacity-60 transition-colors hover:border-primary/30 hover:bg-surface-container-high disabled:cursor-not-allowed disabled:hover:border-outline-variant/25 disabled:hover:bg-surface-container-low"
              >
                <FaGithub className="size-5 opacity-80" aria-hidden />
                {t(locale, "auth.github")}
              </button>
            </div>

            <div className="relative mb-8 flex items-center justify-center">
              <div className="h-px w-full bg-outline-variant/20" />
              <span className="absolute bg-surface-container px-3 font-label text-[10px] uppercase tracking-widest text-outline">
                {t(locale, "auth.orEmail")}
              </span>
            </div>

            <div
              id={`${baseId}-panel-login`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-login`}
              hidden={mode !== "login"}
              className={mode === "login" ? "block" : "hidden"}
            >
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor={`${baseId}-login-email`} className={labelClass}>
                    {t(locale, "auth.email")}
                  </label>
                  <input
                    id={`${baseId}-login-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="dev@example.com"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                    <label htmlFor={`${baseId}-login-password`} className={labelClass}>
                      {t(locale, "auth.password")}
                    </label>
                    <Link
                      href="#recover"
                      className="font-label text-[10px] uppercase tracking-widest text-outline-variant transition-colors hover:text-primary"
                      data-hover-label={t(locale, "auth.lostPassword")}
                    >
                      {t(locale, "auth.lostPassword")}
                    </Link>
                  </div>
                  <input
                    id={`${baseId}-login-password`}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={fieldClass}
                  />
                </div>
                <label className="flex items-center gap-3 px-0.5">
                  <input
                    name="remember"
                    type="checkbox"
                    className="size-4 rounded border-outline-variant/40 bg-surface-container-lowest text-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-xs font-light text-on-surface-variant">{t(locale, "auth.remember")}</span>
                </label>
                <button
                  type="submit"
                  data-hover-label={t(locale, "auth.submitLogin")}
                  className="signature-glow flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed shadow-[0_10px_30px_rgba(0,229,255,0.15)] transition-all hover:shadow-[0_10px_40px_rgba(0,229,255,0.25)] active:scale-[0.98]"
                >
                  {t(locale, "auth.submitLogin")}
                  <ArrowRight className="size-4" aria-hidden strokeWidth={2.5} />
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-on-surface-variant">
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  data-hover-label={t(locale, "auth.switchToRegister")}
                  onClick={() => setMode("register")}
                >
                  {t(locale, "auth.switchToRegister")}
                </button>
              </p>
            </div>

            <div
              id={`${baseId}-panel-register`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-register`}
              hidden={mode !== "register"}
              className={mode === "register" ? "block" : "hidden"}
            >
              <p className="mb-5 text-xs leading-relaxed text-on-surface-variant">{t(locale, "auth.registerHint")}</p>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor={`${baseId}-reg-name`} className={labelClass}>
                    {t(locale, "auth.name")}
                  </label>
                  <input
                    id={`${baseId}-reg-name`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-reg-email`} className={labelClass}>
                    {t(locale, "auth.email")}
                  </label>
                  <input
                    id={`${baseId}-reg-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-reg-password`} className={labelClass}>
                    {t(locale, "auth.password")}
                  </label>
                  <input
                    id={`${baseId}-reg-password`}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-reg-company`} className={labelClass}>
                    {t(locale, "auth.companyOptional")}
                  </label>
                  <input id={`${baseId}-reg-company`} name="company" type="text" autoComplete="organization" className={fieldClass} />
                </div>
                <div>
                  <label htmlFor={`${baseId}-reg-role`} className={labelClass}>
                    {t(locale, "auth.roleOptional")}
                  </label>
                  <input id={`${baseId}-reg-role`} name="role" type="text" autoComplete="organization-title" className={fieldClass} />
                </div>
                <button
                  type="submit"
                  data-hover-label={t(locale, "auth.submitRegister")}
                  className="signature-glow flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed shadow-[0_10px_30px_rgba(0,229,255,0.15)] transition-all hover:shadow-[0_10px_40px_rgba(0,229,255,0.25)] active:scale-[0.98]"
                >
                  {t(locale, "auth.submitRegister")}
                  <ArrowRight className="size-4" aria-hidden strokeWidth={2.5} />
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-on-surface-variant">
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  data-hover-label={t(locale, "auth.switchToLogin")}
                  onClick={() => setMode("login")}
                >
                  {t(locale, "auth.switchToLogin")}
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
