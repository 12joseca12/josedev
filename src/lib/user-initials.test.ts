import {
  displayNameFromAuthUser,
  formatTerminalPromptTemplate,
  initialsFromDisplayName,
  terminalHostFromAuthUser,
} from "./user-initials";

describe("initialsFromDisplayName", () => {
  it("uses first letters of two words", () => {
    expect(initialsFromDisplayName("Jose García")).toBe("JG");
  });

  it("uses email local part", () => {
    expect(initialsFromDisplayName("jose.dev@example.com")).toBe("JD");
  });

  it("returns placeholder when empty", () => {
    expect(initialsFromDisplayName("")).toBe("?");
  });
});

describe("displayNameFromAuthUser", () => {
  it("prefers metadata name", () => {
    expect(displayNameFromAuthUser({ email: "a@b.com", user_metadata: { name: "Ana" } })).toBe("Ana");
  });
});

describe("terminalHostFromAuthUser", () => {
  it("builds host slug from display name", () => {
    expect(
      terminalHostFromAuthUser({
        email: "jose@example.com",
        user_metadata: { name: "José García" },
      }),
    ).toBe("jose");
    expect(formatTerminalPromptTemplate("user@{host}:~$", "jose")).toBe("user@jose:~$");
  });
});
