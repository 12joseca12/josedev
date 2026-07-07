import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dashThemeColors, portfolioThemeColors, styleTokens, zIndexTokens } from "./stylesVariables";

function parseGeneratedBlock<T extends string | number>(
  css: string,
  name: string,
  varPrefix: string,
  parseValue: (raw: string) => T,
): Record<string, T> {
  const begin = `/* BEGIN GENERATED ${name} */`;
  const end = `/* END GENERATED ${name} */`;
  const beginIdx = css.indexOf(begin);
  const endIdx = css.indexOf(end);
  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(`Could not find ${begin} / ${end} markers in globals.css`);
  }
  const block = css.slice(beginIdx + begin.length, endIdx);
  const entries: Record<string, T> = {};
  const pattern = new RegExp(`--${varPrefix}-([a-z0-9-]+):\\s*([^;]+);`, "gi");
  for (const match of block.matchAll(pattern)) {
    entries[match[1]] = parseValue(match[2].trim());
  }
  return entries;
}

describe("globals.css generated theme blocks", () => {
  const cssPath = join(__dirname, "..", "app", "globals.css");
  const css = readFileSync(cssPath, "utf8");

  it("color block matches portfolioThemeColors (run `pnpm generate:theme` if this fails)", () => {
    const generated = parseGeneratedBlock(css, "COLORS", "color", (raw) => raw);
    expect(generated).toEqual(portfolioThemeColors);
  });

  it("z-index block matches zIndexTokens (run `pnpm generate:theme` if this fails)", () => {
    const generated = parseGeneratedBlock(css, "Z-INDEX", "z-index", (raw) => Number(raw));
    expect(generated).toEqual(zIndexTokens);
  });

  it("container block matches styleTokens.layout.maxContentWidth (run `pnpm generate:theme` if this fails)", () => {
    const generated = parseGeneratedBlock(css, "CONTAINER", "container", (raw) => raw);
    expect(generated).toEqual({ content: styleTokens.layout.maxContentWidth });
  });

  it("dash-theme refs block matches dashThemeColors keys (run `pnpm generate:theme` if this fails)", () => {
    // parseGeneratedBlock captures the part of the var name after "color-", e.g.
    // "--color-dash-bg: var(--dash-bg);" → key "dash-bg", value "var(--dash-bg)".
    const generated = parseGeneratedBlock(css, "DASH-THEME-REFS", "color", (raw) => raw);
    const expected: Record<string, string> = {};
    for (const key of Object.keys(dashThemeColors)) {
      expected[key] = `var(--${key})`;
    }
    expect(generated).toEqual(expected);
  });

  it("dash-theme values block matches dashThemeColors light/dark values (run `pnpm generate:theme` if this fails)", () => {
    const begin = "/* BEGIN GENERATED DASH-THEME-VALUES */";
    const end = "/* END GENERATED DASH-THEME-VALUES */";
    const beginIdx = css.indexOf(begin);
    const endIdx = css.indexOf(end);
    expect(beginIdx).not.toBe(-1);
    expect(endIdx).not.toBe(-1);
    const block = css.slice(beginIdx + begin.length, endIdx);

    const rootMatch = block.match(/:root\s*\{([^}]*)\}/);
    const darkMatch = block.match(/html\.dark\s*\{([^}]*)\}/);
    expect(rootMatch).not.toBeNull();
    expect(darkMatch).not.toBeNull();

    const parseVars = (body: string): Record<string, string> => {
      const entries: Record<string, string> = {};
      const pattern = /--([a-z0-9-]+):\s*([^;]+);/gi;
      for (const match of body.matchAll(pattern)) {
        entries[match[1]] = match[2].trim();
      }
      return entries;
    };

    const rootVars = parseVars(rootMatch![1]);
    const darkVars = parseVars(darkMatch![1]);

    const expectedLight: Record<string, string> = {};
    const expectedDark: Record<string, string> = {};
    for (const [key, value] of Object.entries(dashThemeColors)) {
      expectedLight[key] = value.light;
      expectedDark[key] = value.dark;
    }

    expect(rootVars).toEqual(expectedLight);
    expect(darkVars).toEqual(expectedDark);
  });
});
