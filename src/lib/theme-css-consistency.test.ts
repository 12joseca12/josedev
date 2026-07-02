import { readFileSync } from "node:fs";
import { join } from "node:path";
import { portfolioThemeColors } from "./stylesVariables";

const BEGIN = "/* BEGIN GENERATED COLORS */";
const END = "/* END GENERATED COLORS */";

function parseGeneratedBlock(css: string): Record<string, string> {
  const beginIdx = css.indexOf(BEGIN);
  const endIdx = css.indexOf(END);
  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(`Could not find ${BEGIN} / ${END} markers in globals.css`);
  }
  const block = css.slice(beginIdx + BEGIN.length, endIdx);
  const entries: Record<string, string> = {};
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)) {
    entries[match[1]] = match[2];
  }
  return entries;
}

describe("globals.css generated color block", () => {
  it("matches portfolioThemeColors (run `pnpm generate:theme` if this fails)", () => {
    const cssPath = join(__dirname, "..", "app", "globals.css");
    const css = readFileSync(cssPath, "utf8");
    const generated = parseGeneratedBlock(css);
    expect(generated).toEqual(portfolioThemeColors);
  });
});
