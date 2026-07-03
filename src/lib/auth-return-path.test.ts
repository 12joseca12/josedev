import { buildAuthHref, resolvePostAuthPath } from "./auth-return-path";
import { sanitizeInternalNextPath } from "./safe-next-path";

describe("buildAuthHref", () => {
  it("adds next for internal paths", () => {
    const href = buildAuthHref("es", "/foro/dev/hilo");
    expect(href).toBe("/es/auth?next=%2Fforo%2Fdev%2Fhilo");
  });

  it("omits next for auth routes", () => {
    expect(buildAuthHref("es", "/es/auth")).toBe("/es/auth");
  });
});

describe("resolvePostAuthPath", () => {
  it("prefers explicit next", () => {
    expect(resolvePostAuthPath("es", "/foro/a/b")).toBe("/foro/a/b");
  });

  it("falls back to home", () => {
    expect(resolvePostAuthPath("es", null)).toBe("/es");
  });

  it("rejects open redirects", () => {
    expect(resolvePostAuthPath("es", "//evil.com")).toBe("/es");
  });
});

describe("sanitizeInternalNextPath", () => {
  it("decodes encoded paths", () => {
    expect(sanitizeInternalNextPath("%2Fforo%2Fx")).toBe("/foro/x");
  });
});
