import { MAX_FILE_BYTES, ALLOWED_MIME_TYPES, isAllowedMime, isWithinSize } from "./assets-config";

describe("assets-config", () => {
  it("caps at 25 MB", () => {
    expect(MAX_FILE_BYTES).toBe(26214400);
  });
  it("accepts allowed mimes and rejects others", () => {
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("image/png")).toBe(true);
    expect(isAllowedMime("application/x-msdownload")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });
  it("enforces size bounds (0 < bytes <= max)", () => {
    expect(isWithinSize(1)).toBe(true);
    expect(isWithinSize(MAX_FILE_BYTES)).toBe(true);
    expect(isWithinSize(MAX_FILE_BYTES + 1)).toBe(false);
    expect(isWithinSize(0)).toBe(false);
  });
  it("ALLOWED_MIME_TYPES has no duplicates", () => {
    expect(new Set(ALLOWED_MIME_TYPES).size).toBe(ALLOWED_MIME_TYPES.length);
  });
});
