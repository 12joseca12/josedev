import { buildAuthHref, resolvePostAuthPath } from "./auth-return-path";
import { sanitizeInternalNextPath } from "./safe-next-path";

describe("buildAuthHref", () => {
  it("adds next for internal paths", () => {
    const href = buildAuthHref("/foro/dev/hilo");
    expect(href).toBe("/auth?next=%2Fforo%2Fdev%2Fhilo");
  });

  it("omits next for auth routes", () => {
    expect(buildAuthHref("/auth")).toBe("/auth");
  });
});

describe("resolvePostAuthPath", () => {
  it("prefers explicit next", () => {
    expect(resolvePostAuthPath("/foro/a/b")).toBe("/foro/a/b");
  });

  it("falls back to home", () => {
    expect(resolvePostAuthPath(null)).toBe("/");
  });

  it("rejects open redirects", () => {
    expect(resolvePostAuthPath("//evil.com")).toBe("/");
  });
});

describe("sanitizeInternalNextPath", () => {
  it("decodes encoded paths", () => {
    expect(sanitizeInternalNextPath("%2Fforo%2Fx")).toBe("/foro/x");
  });
});
