"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = { locale: Locale };

type Step = "loading" | "password" | "mfa-enroll" | "done";

const fieldClass =
  "w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface placeholder:text-outline/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 font-mono";

const labelClass =
  "mb-1.5 block font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant";

export function StaffOnboardingClient({ locale }: Props) {
  const baseId = useId();
  const [step, setStep] = useState<Step>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseSSRBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign(`/${locale}/staff/login`);
        return;
      }
      const { data: staffRow } = await supabase
        .from("staff_members")
        .select("must_change_password")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!staffRow) {
        await supabase.auth.signOut();
        window.location.assign(`/${locale}/staff/login`);
        return;
      }
      setStep(staffRow.must_change_password ? "password" : "mfa-enroll");
    })();
  }, [locale]);

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError(t(locale, "staffAuth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t(locale, "staffAuth.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseSSRBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("staff_members").update({ must_change_password: false }).eq("user_id", user.id);
      }
      setStep("mfa-enroll");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "mfa-enroll" || qrCode) return;
    (async () => {
      const supabase = getSupabaseSSRBrowserClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError || !data) {
        setError(enrollError?.message ?? t(locale, "staffAuth.mfaErrorInvalid"));
        return;
      }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    })();
  }, [step, qrCode, locale]);

  async function onSubmitMfaEnroll(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!factorId) return;
    setBusy(true);
    try {
      const supabase = getSupabaseSSRBrowserClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        setError(t(locale, "staffAuth.mfaErrorInvalid"));
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) {
        setError(t(locale, "staffAuth.mfaErrorInvalid"));
        return;
      }
      setStep("done");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: staffRow } = user
        ? await supabase.from("staff_members").select("role").eq("user_id", user.id).maybeSingle()
        : { data: null };
      const destination = staffRow?.role === "admin" ? `/${locale}/admin` : `/${locale}/closer`;
      window.location.assign(destination);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/25 bg-surface-container-lowest/85 p-8 shadow-[0_40px_80px_rgba(0,0,0,0.45)]">
        <h1 className="mb-6 font-headline text-xl font-bold text-on-surface">
          {t(locale, "staffAuth.onboardingTitle")}
        </h1>

        {error ? (
          <div role="alert" className="mb-5 rounded-xl border border-error/35 bg-surface-container-low/60 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : null}

        {step === "loading" ? null : null}

        {step === "password" ? (
          <form className="space-y-4" onSubmit={onSubmitPassword}>
            <p className="text-sm text-on-surface-variant">{t(locale, "staffAuth.onboardingPasswordStepTitle")}</p>
            <div>
              <label htmlFor={`${baseId}-new-pw`} className={labelClass}>
                {t(locale, "staffAuth.newPassword")}
              </label>
              <input
                id={`${baseId}-new-pw`}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`${baseId}-confirm-pw`} className={labelClass}>
                {t(locale, "staffAuth.confirmPassword")}
              </label>
              <input
                id={`${baseId}-confirm-pw`}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="signature-glow w-full rounded-lg py-3.5 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed disabled:opacity-60"
            >
              {t(locale, "staffAuth.continueButton")}
            </button>
          </form>
        ) : null}

        {step === "mfa-enroll" ? (
          <form className="space-y-4" onSubmit={onSubmitMfaEnroll}>
            <p className="text-sm text-on-surface-variant">{t(locale, "staffAuth.onboardingMfaStepTitle")}</p>
            {qrCode ? (
              <>
                <p className="text-xs text-on-surface-variant">{t(locale, "staffAuth.mfaScanInstructions")}</p>
                <div
                  className="mx-auto w-fit rounded-lg bg-white p-3"
                  // eslint-disable-next-line react/no-danger -- SVG viene directo de Supabase Auth (auth.mfa.enroll), no de input de usuario.
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
                {secret ? (
                  <p className="break-all text-center font-mono text-[11px] text-on-surface-variant">
                    {t(locale, "staffAuth.mfaManualEntry")} <span className="text-on-surface">{secret}</span>
                  </p>
                ) : null}
                <div>
                  <label htmlFor={`${baseId}-mfa-verify`} className={labelClass}>
                    {t(locale, "staffAuth.mfaVerifyCodeLabel")}
                  </label>
                  <input
                    id={`${baseId}-mfa-verify`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
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
                  {t(locale, "staffAuth.mfaEnrollSubmit")}
                </button>
              </>
            ) : null}
          </form>
        ) : null}

        {step === "done" ? <p className="text-sm text-on-surface-variant">{t(locale, "staffAuth.onboardingComplete")}</p> : null}
      </div>
    </main>
  );
}
