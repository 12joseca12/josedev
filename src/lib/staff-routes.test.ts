import {
  isAdminPath,
  isClientAreaPath,
  isCloserPath,
  isStaffLoginPath,
  isStaffOnboardingPath,
  stripLocale,
} from "./staff-routes";

describe("stripLocale", () => {
  it("removes a supported locale prefix", () => {
    expect(stripLocale("/es/admin")).toBe("/admin");
    expect(stripLocale("/en/closer/leads")).toBe("/closer/leads");
  });

  it("returns / for a bare locale path", () => {
    expect(stripLocale("/es")).toBe("/");
  });

  it("leaves an unprefixed path untouched", () => {
    expect(stripLocale("/admin")).toBe("/admin");
  });

  it("does not strip a segment that looks like a locale but isn't supported", () => {
    expect(stripLocale("/fr/admin")).toBe("/fr/admin");
  });
});

describe("isAdminPath / isCloserPath / isStaffLoginPath / isStaffOnboardingPath", () => {
  it("matches the bare path and nested paths", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/leads")).toBe(true);
    expect(isCloserPath("/closer")).toBe(true);
    expect(isCloserPath("/closer/leads/123")).toBe(true);
    expect(isStaffLoginPath("/staff/login")).toBe(true);
    expect(isStaffOnboardingPath("/staff/onboarding")).toBe(true);
  });

  it("does not match unrelated or prefix-colliding paths", () => {
    expect(isAdminPath("/administracion")).toBe(false);
    expect(isCloserPath("/closerish")).toBe(false);
    expect(isStaffLoginPath("/staff/login-history")).toBe(false);
    expect(isStaffOnboardingPath("/staff/onboarding-guide")).toBe(false);
  });

  it("does not cross-match between admin/closer/staff paths", () => {
    expect(isAdminPath("/closer")).toBe(false);
    expect(isCloserPath("/admin")).toBe(false);
    expect(isStaffLoginPath("/staff/onboarding")).toBe(false);
    expect(isStaffOnboardingPath("/staff/login")).toBe(false);
  });
});

describe("isClientAreaPath", () => {
  it("matches the bare path and nested", () => {
    expect(isClientAreaPath("/area-clientes")).toBe(true);
    expect(isClientAreaPath("/area-clientes/tareas")).toBe(true);
  });
  it("does not match prefix collisions", () => {
    expect(isClientAreaPath("/area-clientes-x")).toBe(false);
    expect(isClientAreaPath("/perfil")).toBe(false);
  });
});
