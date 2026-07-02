import { resolveAuthErrorLiteralKey, resolveAuthErrorUiAction } from "./auth-error-codes";

describe("resolveAuthErrorLiteralKey", () => {
  it("maps email_exists", () => {
    expect(resolveAuthErrorLiteralKey({ code: "email_exists", message: "User already registered" })).toBe(
      "auth.errors.emailExists",
    );
  });

  it("maps invalid_credentials", () => {
    expect(
      resolveAuthErrorLiteralKey({ code: "invalid_credentials", message: "Invalid login credentials" }),
    ).toBe("auth.errors.invalidCredentials");
  });

  it("falls back to generic for unknown errors", () => {
    expect(resolveAuthErrorLiteralKey({ code: "unexpected_failure", message: "x.y.z internal" })).toBe(
      "auth.errorGeneric",
    );
  });
});

describe("resolveAuthErrorUiAction", () => {
  it("switches to login when email exists on register", () => {
    expect(resolveAuthErrorUiAction({ code: "email_exists" }, "register")).toBe("switch-login");
  });

  it("switches to register when invalid credentials on login", () => {
    expect(resolveAuthErrorUiAction({ code: "invalid_credentials" }, "login")).toBe("switch-register");
  });
});
