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
  "w-full rounded-md border border-dash-border bg-dash-bg px-4 py-3.5 text-sm text-dash-text placeholder:text-dash-muted/70 transition-colors focus:border-dash-accent/60 focus:outline-none focus:ring-2 focus:ring-dash-accent/30";

const labelClass = "mb-1.5 block font-label text-[10px] font-medium uppercase tracking-widest text-dash-muted";

const requiredStarClass = "ms-0.5 font-semibold text-dash-accent-text";

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
    navigateAfterAuth(resolvePostAuthPath(locale, redirectAfterAuth));
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
      <div className="relative z-10 grid w-full max-w-[1100px] overflow-hidden rounded-lg border border-dash-border bg-dash-surface shadow-[0_24px_64px_rgba(0,0,0,0.12)] lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden border-dash-border bg-dash-bg p-10 lg:flex lg:border-r lg:p-12">
          <div>
            <div className="mb-12 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border border-dash-border bg-dash-surface">
                <Terminal className="size-5 text-dash-accent" aria-hidden strokeWidth={2.25} />
              </span>
              <span className="font-headline text-xl font-extrabold tracking-tighter text-dash-text">
                {t(locale, "nav.brand")}
              </span>
            </div>
            <p className="mb-5 font-headline text-4xl font-bold leading-[1.15] tracking-tight text-dash-text xl:text-5xl">
              {t(locale, "auth.brandPanelTitle")}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-dash-muted">{t(locale, "auth.brandPanelSubtitle")}</p>
          </div>
          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-dash-border" />
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-dash-muted">
                {t(locale, "auth.eyebrow")}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="size-2 animate-pulse rounded-full bg-dash-accent motion-reduce:animate-none" />
              <span className="size-2 rounded-full bg-dash-accent/30" />
              <span className="size-2 rounded-full bg-dash-accent/30" />
            </div>
          </div>
        </section>

        <section className="relative flex flex-col justify-center bg-dash-surface p-6 sm:p-10 md:p-14">
          <div className="mx-auto w-full max-w-md">
            <h1 className="sr-only">
              {mode === "login" ? t(locale, "auth.loginTitle") : t(locale, "auth.registerTitle")}
            </h1>

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
                className={`rounded-md border px-3 py-2.5 font-headline text-xs font-bold uppercase tracking-tight transition-colors sm:text-sm ${
                  mode === "login"
                    ? "border-dash-accent/50 bg-dash-bg text-dash-text"
                    : "border-dash-border bg-transparent text-dash-muted hover:border-dash-border/80 hover:text-dash-text"
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
                className={`rounded-md border px-3 py-2.5 font-headline text-xs font-bold uppercase tracking-tight transition-colors sm:text-sm ${
                  mode === "register"
                    ? "border-dash-accent/50 bg-dash-bg text-dash-text"
                    : "border-dash-border bg-transparent text-dash-muted hover:border-dash-border/80 hover:text-dash-text"
                }`}
                onClick={() => setMode("register")}
              >
                {t(locale, "auth.registerTab")}
              </button>
            </div>

            <div className="relative mb-8 flex items-center justify-center">
              <div className="h-px w-full bg-dash-border" />
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
                  className={`mb-5 rounded-md border px-4 py-3 text-sm ${
                    error
                      ? "border-dash-error/40 bg-dash-error/10 text-dash-error"
                      : "border-dash-success/35 bg-dash-success/10 text-dash-text"
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
                      className="font-label text-[10px] uppercase tracking-widest text-dash-muted transition-colors hover:text-dash-accent-text"
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
                    className="size-4 rounded border-dash-border bg-dash-bg accent-dash-accent focus:ring-2 focus:ring-dash-accent/30"
                    checked={login.remember}
                    onChange={(e) => setLogin((s) => ({ ...s, remember: e.target.checked }))}
                  />
                  <span className="text-xs text-dash-muted">{t(locale, "auth.remember")}</span>
                </label>
                <button
                  type="submit"
                  data-hover-label={t(locale, "auth.submitLogin")}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-dash-accent py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-dash-bg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
                >
                  {busy ? t(locale, "auth.submitting") : t(locale, "auth.submitLogin")}
                  <ArrowRight className="size-4" aria-hidden strokeWidth={2.5} />
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-dash-muted">
                <button
                  type="button"
                  className="text-dash-accent-text underline-offset-4 hover:underline"
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
                  className={`mb-5 rounded-md border px-4 py-3 text-sm ${
                    error
                      ? "border-dash-error/40 bg-dash-error/10 text-dash-error"
                      : "border-dash-success/35 bg-dash-success/10 text-dash-text"
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
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-dash-accent py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-dash-bg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
                >
                  {busy ? t(locale, "auth.submitting") : t(locale, "auth.submitRegister")}
                  <ArrowRight className="size-4" aria-hidden strokeWidth={2.5} />
                </button>
              </form>
              <p className="mt-8 text-center text-xs text-dash-muted">
                <button
                  type="button"
                  className="text-dash-accent-text underline-offset-4 hover:underline"
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
