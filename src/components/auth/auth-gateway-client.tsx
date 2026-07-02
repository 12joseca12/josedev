"use client";

import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import {
  navigateAfterAuth,
  rememberAuthReturnFromReferrer,
  rememberAuthReturnPath,
  resolvePostAuthPath,
} from "@/lib/auth-return-path";
import { resolveAuthErrorMessage, resolveAuthErrorUiAction } from "@/lib/auth-errors";
import type { Locale } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  /** Ruta interna tras login o registro (por ejemplo `/foro/...`). */
  redirectAfterAuth?: string | null;
};

type Mode = "login" | "register";

const fieldClass =
  "w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25";

const labelClass =
  "mb-1.5 block font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant";

const requiredStarClass = "ms-0.5 font-semibold text-primary";

function RequiredFieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
      <span className={requiredStarClass} aria-hidden="true">
        *
      </span>
    </label>
  );
}

export function AuthGatewayClient({ locale, redirectAfterAuth = null }: Props) {
  const baseId = useId();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [login, setLogin] = useState({ email: "", password: "", remember: true });
  const [register, setRegister] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
    role: "",
  });

  useEffect(() => {
    if (redirectAfterAuth) {
      rememberAuthReturnPath(redirectAfterAuth);
      return;
    }
    rememberAuthReturnFromReferrer();
  }, [redirectAfterAuth]);

  const finishAuthRedirect = () => {
    navigateAfterAuth(resolvePostAuthPath(redirectAfterAuth));
  };

  const focusTab = (next: Mode) => {
    const id = next === "login" ? `${baseId}-tab-login` : `${baseId}-tab-register`;
    queueMicrotask(() => {
      document.getElementById(id)?.focus();
    });
  };

  const applyAuthFailure = (err: unknown, context: "login" | "register") => {
    const uiAction = resolveAuthErrorUiAction(err, context);
    if (uiAction === "switch-login") {
      setMode("login");
      focusTab("login");
    } else if (uiAction === "switch-register") {
      setMode("register");
      focusTab("register");
    }
    setError(resolveAuthErrorMessage(locale, err));
  };

  const handleTabListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.target || !(e.target instanceof HTMLElement) || !e.target.id.includes("-tab-")) return;
    if (e.key === "Home") {
      e.preventDefault();
      setMode("login");
      focusTab("login");
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setMode("register");
      focusTab("register");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next: Mode = mode === "login" ? "register" : "login";
      setMode(next);
      focusTab(next);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next: Mode = mode === "register" ? "login" : "register";
      setMode(next);
      focusTab(next);
    }
  };

  async function onSubmitLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: login.email,
        password: login.password,
      });
      if (signInError) {
        applyAuthFailure(signInError, "login");
        return;
      }
      finishAuthRedirect();
    } catch {
      setError(t(locale, "auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: register.email,
        password: register.password,
        options: {
          data: {
            name: register.name,
            company: register.company || undefined,
            role: register.role || undefined,
          },
        },
      });
      if (signUpError) {
        applyAuthFailure(signUpError, "register");
        return;
      }

      const hasSession = Boolean(signUpData.session);
      if (!hasSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: register.email,
          password: register.password,
        });
        if (signInError) {
          if (signInError.code === "email_not_confirmed") {
            applyAuthFailure(signInError, "register");
            return;
          }
          setNotice(t(locale, "auth.registerSuccess"));
          setMode("login");
          focusTab("login");
          return;
        }
        if (signInData.session) {
          finishAuthRedirect();
          return;
        }
      }

      finishAuthRedirect();
    } catch {
      setError(t(locale, "auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

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
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-container shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary-container)_35%,transparent)]">
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
              <span className="size-2 animate-pulse rounded-full bg-tertiary shadow-[0_0_8px_color-mix(in_srgb,var(--color-tertiary)_45%,transparent)]" />
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
              onKeyDown={handleTabListKeyDown}
            >
              <button
                type="button"
                role="tab"
                id={`${baseId}-tab-login`}
                tabIndex={mode === "login" ? 0 : -1}
                aria-selected={mode === "login"}
                aria-controls={`${baseId}-panel-login`}
                data-hover-label={t(locale, "auth.loginTab")}
                className={`rounded-xl border px-3 py-2.5 font-headline text-xs font-bold uppercase tracking-tight transition-all sm:text-sm ${
                  mode === "login"
                    ? "border-primary/40 bg-surface-container-high text-on-surface shadow-[0_0_24px_color-mix(in_srgb,var(--color-primary-container)_12%,transparent)]"
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
                tabIndex={mode === "register" ? 0 : -1}
                aria-selected={mode === "register"}
                aria-controls={`${baseId}-panel-register`}
                data-hover-label={t(locale, "auth.registerTab")}
                className={`rounded-xl border px-3 py-2.5 font-headline text-xs font-bold uppercase tracking-tight transition-all sm:text-sm ${
                  mode === "register"
                    ? "border-primary/40 bg-surface-container-high text-on-surface shadow-[0_0_24px_color-mix(in_srgb,var(--color-primary-container)_12%,transparent)]"
                    : "border-outline-variant/25 bg-surface-container-low/40 text-on-surface-variant hover:border-outline-variant/45"
                }`}
                onClick={() => setMode("register")}
              >
                {t(locale, "auth.registerTab")}
              </button>
            </div>

            <div className="relative mb-8 flex items-center justify-center">
              <div className="h-px w-full bg-outline-variant/20" />
            </div>

            <div
              id={`${baseId}-panel-login`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-login`}
              hidden={mode !== "login"}
              className={mode === "login" ? "block" : "hidden"}
            >
              {error || notice ? (
                <div
                  className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                    error
                      ? "border-error/35 bg-surface-container-low/60 text-error"
                      : "border-tertiary/30 bg-surface-container-low/60 text-on-surface"
                  }`}
                  role={error ? "alert" : "status"}
                >
                  {error ?? notice}
                </div>
              ) : null}

              <form className="space-y-5" onSubmit={onSubmitLogin}>
                <p className="sr-only">{t(locale, "auth.requiredLegend")}</p>
                <div>
                  <RequiredFieldLabel htmlFor={`${baseId}-login-email`}>{t(locale, "auth.email")}</RequiredFieldLabel>
                  <input
                    id={`${baseId}-login-email`}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={254}
                    required
                    aria-required="true"
                    placeholder={t(locale, "auth.emailPlaceholder")}
                    className={fieldClass}
                    value={login.email}
                    onChange={(e) => setLogin((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                    <RequiredFieldLabel htmlFor={`${baseId}-login-password`}>
                      {t(locale, "auth.password")}
                    </RequiredFieldLabel>
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={256}
                    required
                    aria-required="true"
                    className={fieldClass}
                    value={login.password}
                    onChange={(e) => setLogin((s) => ({ ...s, password: e.target.value }))}
                  />
                </div>
                <label htmlFor={`${baseId}-remember`} className="flex cursor-pointer items-center gap-3 px-0.5">
                  <input
                    id={`${baseId}-remember`}
                    name="remember"
                    type="checkbox"
                    className="size-4 rounded border-outline-variant/40 bg-surface-container-lowest text-primary focus:ring-2 focus:ring-primary/30"
                    checked={login.remember}
                    onChange={(e) => setLogin((s) => ({ ...s, remember: e.target.checked }))}
                  />
                  <span className="text-xs font-light text-on-surface-variant">{t(locale, "auth.remember")}</span>
                </label>
                <button
                  type="submit"
                  data-hover-label={t(locale, "auth.submitLogin")}
                  disabled={busy}
                  className="signature-glow flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)] transition-all hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--color-primary-container)_25%,transparent)] active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? t(locale, "auth.submitting") : t(locale, "auth.submitLogin")}
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
              {error || notice ? (
                <div
                  className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                    error
                      ? "border-error/35 bg-surface-container-low/60 text-error"
                      : "border-tertiary/30 bg-surface-container-low/60 text-on-surface"
                  }`}
                  role={error ? "alert" : "status"}
                >
                  {error ?? notice}
                </div>
              ) : null}

              <form className="space-y-5" onSubmit={onSubmitRegister}>
                <p className="sr-only">{t(locale, "auth.requiredLegend")}</p>
                <div>
                  <RequiredFieldLabel htmlFor={`${baseId}-reg-name`}>{t(locale, "auth.name")}</RequiredFieldLabel>
                  <input
                    id={`${baseId}-reg-name`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    spellCheck={false}
                    maxLength={120}
                    required
                    aria-required="true"
                    className={fieldClass}
                    value={register.name}
                    onChange={(e) => setRegister((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div>
                  <RequiredFieldLabel htmlFor={`${baseId}-reg-email`}>{t(locale, "auth.email")}</RequiredFieldLabel>
                  <input
                    id={`${baseId}-reg-email`}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={254}
                    required
                    aria-required="true"
                    placeholder={t(locale, "auth.emailPlaceholder")}
                    className={fieldClass}
                    value={register.email}
                    onChange={(e) => setRegister((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>
                <div>
                  <RequiredFieldLabel htmlFor={`${baseId}-reg-password`}>
                    {t(locale, "auth.password")}
                  </RequiredFieldLabel>
                  <input
                    id={`${baseId}-reg-password`}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={256}
                    required
                    aria-required="true"
                    className={fieldClass}
                    value={register.password}
                    onChange={(e) => setRegister((s) => ({ ...s, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-reg-company`} className={labelClass}>
                    {t(locale, "auth.companyOptional")}
                  </label>
                  <input
                    id={`${baseId}-reg-company`}
                    name="company"
                    type="text"
                    autoComplete="organization"
                    spellCheck={false}
                    maxLength={120}
                    className={fieldClass}
                    value={register.company}
                    onChange={(e) => setRegister((s) => ({ ...s, company: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-reg-role`} className={labelClass}>
                    {t(locale, "auth.roleOptional")}
                  </label>
                  <input
                    id={`${baseId}-reg-role`}
                    name="role"
                    type="text"
                    autoComplete="organization-title"
                    spellCheck={false}
                    maxLength={120}
                    className={fieldClass}
                    value={register.role}
                    onChange={(e) => setRegister((s) => ({ ...s, role: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  data-hover-label={t(locale, "auth.submitRegister")}
                  disabled={busy}
                  className="signature-glow flex w-full items-center justify-center gap-2 rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)] transition-all hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--color-primary-container)_25%,transparent)] active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? t(locale, "auth.submitting") : t(locale, "auth.submitRegister")}
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
