"use client";

import { useId, useState, type FormEvent } from "react";

import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = { locale: Locale };

type Step = "credentials" | "mfa";

const fieldClass =
  "w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono";

const labelClass =
  "mb-1.5 block font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant";

/** Tras password+MFA ok, decide destino según rol y estado de onboarding en staff_members. */
async function resolveDestination(locale: Locale): Promise<string> {
  const supabase = getSupabaseSSRBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return `/${locale}/staff/login`;

  const { data: staffRow } = await supabase
    .from("staff_members")
    .select("role, must_change_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staffRow) {
    // No es staff: nunca dejamos una sesión de "casi-staff" colgando.
    await supabase.auth.signOut();
    return `/${locale}/staff/login`;
  }

  if (staffRow.must_change_password) {
    return `/${locale}/staff/onboarding`;
  }

  return staffRow.role === "admin" ? `/${locale}/admin` : `/${locale}/closer`;
}

export function StaffLoginClient({ locale }: Props) {
  const baseId = useId();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmitCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseSSRBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(t(locale, "staffAuth.errorInvalid"));
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        setStep("mfa");
        return;
      }

      window.location.assign(await resolveDestination(locale));
    } catch {
      setError(t(locale, "staffAuth.errorInvalid"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitMfa(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseSSRBrowserClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.[0];
      if (!factor) {
        setError(t(locale, "staffAuth.mfaErrorInvalid"));
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challengeError) {
        setError(t(locale, "staffAuth.mfaErrorInvalid"));
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) {
        setError(t(locale, "staffAuth.mfaErrorInvalid"));
        return;
      }
      window.location.assign(await resolveDestination(locale));
    } catch {
      setError(t(locale, "staffAuth.mfaErrorInvalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant/25 bg-surface-container-lowest/85 p-8 shadow-[0_40px_80px_rgba(0,0,0,0.45)]">
        <h1 className="mb-1 font-headline text-xl font-bold text-on-surface">
          {step === "credentials" ? t(locale, "staffAuth.loginTitle") : t(locale, "staffAuth.mfaTitle")}
        </h1>
        <p className="mb-6 text-xs text-on-surface-variant">
          {step === "credentials" ? t(locale, "staffAuth.loginSubtitle") : t(locale, "staffAuth.mfaSubtitle")}
        </p>

        {error ? (
          <div role="alert" className="mb-5 rounded-xl border border-error/35 bg-surface-container-low/60 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : null}

        {step === "credentials" ? (
          <form className="space-y-4" onSubmit={onSubmitCredentials}>
            <div>
              <label htmlFor={`${baseId}-email`} className={labelClass}>
                {t(locale, "staffAuth.email")}
              </label>
              <input
                id={`${baseId}-email`}
                type="email"
                required
                autoComplete="email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`${baseId}-password`} className={labelClass}>
                {t(locale, "staffAuth.password")}
              </label>
              <input
                id={`${baseId}-password`}
                type="password"
                required
                autoComplete="current-password"
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="signature-glow w-full rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed disabled:opacity-60"
            >
              {busy ? t(locale, "staffAuth.submitting") : t(locale, "staffAuth.submitLogin")}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={onSubmitMfa}>
            <div>
              <label htmlFor={`${baseId}-mfa`} className={labelClass}>
                {t(locale, "staffAuth.mfaTitle")}
              </label>
              <input
                id={`${baseId}-mfa`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                placeholder={t(locale, "staffAuth.mfaCodePlaceholder")}
                className={`${fieldClass} text-center tracking-[0.5em]`}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              type="submit"
              disabled={busy || mfaCode.length !== 6}
              className="signature-glow w-full rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed disabled:opacity-60"
            >
              {busy ? t(locale, "staffAuth.submitting") : t(locale, "staffAuth.mfaSubmit")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
