/** Acción de UI tras un error de autenticación. */
export type AuthErrorUiAction = "switch-login" | "switch-register";

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

function isAuthErrorLike(error: unknown): error is AuthErrorLike {
  return typeof error === "object" && error !== null;
}

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

function literalKeyForCode(code: string): string | null {
  const map: Record<string, string> = {
    email_exists: "auth.errors.emailExists",
    user_already_exists: "auth.errors.emailExists",
    invalid_credentials: "auth.errors.invalidCredentials",
    user_not_found: "auth.errors.invalidCredentials",
    email_not_confirmed: "auth.errors.emailNotConfirmed",
    weak_password: "auth.errors.weakPassword",
    over_request_rate_limit: "auth.errors.rateLimited",
    over_email_send_rate_limit: "auth.errors.rateLimited",
    signup_disabled: "auth.errors.signupDisabled",
    validation_failed: "auth.errors.validationFailed",
  };
  return map[code] ?? null;
}

function literalKeyForMessage(message: string): string | null {
  const m = normalizeMessage(message);
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "auth.errors.invalidCredentials";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "auth.errors.emailExists";
  }
  if (m.includes("email not confirmed") || m.includes("email address not confirmed")) {
    return "auth.errors.emailNotConfirmed";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("short"))) {
    return "auth.errors.weakPassword";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "auth.errors.rateLimited";
  }
  return null;
}

/** Clave de literals para el error (siempre bajo `auth.*`). */
export function resolveAuthErrorLiteralKey(error: unknown): string {
  if (!isAuthErrorLike(error)) {
    return "auth.errorGeneric";
  }

  const code = typeof error.code === "string" ? error.code : "";
  if (code) {
    const fromCode = literalKeyForCode(code);
    if (fromCode) return fromCode;
  }

  const message = typeof error.message === "string" ? error.message : "";
  if (message) {
    const fromMessage = literalKeyForMessage(message);
    if (fromMessage) return fromMessage;
  }

  return "auth.errorGeneric";
}

/** Cambia de pestaña según el tipo de error (p. ej. cuenta existente → login). */
export function resolveAuthErrorUiAction(error: unknown, context: "login" | "register"): AuthErrorUiAction | null {
  if (!isAuthErrorLike(error)) return null;

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const m = normalizeMessage(message);

  if (
    context === "register" &&
    (code === "email_exists" ||
      code === "user_already_exists" ||
      m.includes("user already registered") ||
      m.includes("already been registered"))
  ) {
    return "switch-login";
  }

  if (
    context === "login" &&
    (code === "invalid_credentials" || code === "user_not_found" || m.includes("invalid login credentials"))
  ) {
    return "switch-register";
  }

  return null;
}
