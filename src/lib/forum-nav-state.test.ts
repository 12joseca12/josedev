import { resolveActiveThematicSlug, syncExpandedWithActive, toggleExpandedSlug } from "./forum-nav-state";

describe("resolveActiveThematicSlug", () => {
  it("returns slug on thematic route", () => {
    expect(resolveActiveThematicSlug("/foro/arquitectura")).toBe("arquitectura");
  });

  it("returns slug on thread route", () => {
    expect(resolveActiveThematicSlug("/foro/arquitectura/mi-hilo")).toBe("arquitectura");
  });

  it("returns null on index and new entry", () => {
    expect(resolveActiveThematicSlug("/foro")).toBe(null);
    expect(resolveActiveThematicSlug("/foro/new")).toBe(null);
  });
});

describe("syncExpandedWithActive", () => {
  it("adds active slug when missing", () => {
    const next = syncExpandedWithActive(new Set(["a"]), "b");
    expect([...next].sort()).toEqual(["a", "b"]);
  });
});

describe("toggleExpandedSlug", () => {
  it("toggles off including active thematic", () => {
    const next = toggleExpandedSlug(new Set(["a", "b"]), "b");
    expect([...next]).toEqual(["a"]);
  });

  it("toggles on", () => {
    const next = toggleExpandedSlug(new Set(["a"]), "b");
    expect([...next].sort()).toEqual(["a", "b"]);
  });
});
