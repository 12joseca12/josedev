import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { portfolioThemeColors } from "../src/lib/stylesVariables.ts";

const BEGIN = "/* BEGIN GENERATED COLORS */";
const END = "/* END GENERATED COLORS */";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, "..", "src", "app", "globals.css");

const generatedLines = (Object.entries(portfolioThemeColors) as [string, string][]).map(
  ([key, value]) => `  --color-${key}: ${value};`,
);

const css = readFileSync(cssPath, "utf8");
const beginIdx = css.indexOf(BEGIN);
const endIdx = css.indexOf(END);
if (beginIdx === -1 || endIdx === -1) {
  throw new Error(`generate-theme-css: could not find ${BEGIN} / ${END} markers in globals.css`);
}

const next =
  css.slice(0, beginIdx) +
  `${BEGIN}\n` +
  generatedLines.join("\n") +
  `\n  ${END}` +
  css.slice(endIdx + END.length);

writeFileSync(cssPath, next);
console.log(`generate-theme-css: wrote ${generatedLines.length} color tokens to globals.css`);
