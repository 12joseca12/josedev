import { isNavLinkActive } from "./nav-active";

describe("isNavLinkActive", () => {
  it("marks home only on root", () => {
    expect(isNavLinkActive("/", "/")).toBe(true);
    expect(isNavLinkActive("/", "/blog")).toBe(false);
  });

  it("marks section for nested routes", () => {
    expect(isNavLinkActive("/blog", "/blog/my-post")).toBe(true);
    expect(isNavLinkActive("/foro", "/foro/dev/hilo")).toBe(true);
    expect(isNavLinkActive("/sobre-mi", "/sobre-mi")).toBe(true);
  });

  it("does not mark partial path matches", () => {
    expect(isNavLinkActive("/blog", "/blog-archive")).toBe(false);
  });
});
