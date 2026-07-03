import { readFileSync } from "node:fs";
import { join } from "node:path";
import { portfolioThemeColors, styleTokens, zIndexTokens } from "./stylesVariables";

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
});
