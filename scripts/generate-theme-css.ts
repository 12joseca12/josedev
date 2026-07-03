import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { portfolioThemeColors, styleTokens, zIndexTokens } from "../src/lib/stylesVariables.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, "..", "src", "app", "globals.css");

function replaceBlock(css: string, name: string, lines: string[]): string {
  const begin = `/* BEGIN GENERATED ${name} */`;
  const end = `/* END GENERATED ${name} */`;
  const beginIdx = css.indexOf(begin);
  const endIdx = css.indexOf(end);
  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(`generate-theme-css: could not find ${begin} / ${end} markers in globals.css`);
  }
  return css.slice(0, beginIdx) + `${begin}\n` + lines.join("\n") + `\n  ${end}` + css.slice(endIdx + end.length);
}

let css = readFileSync(cssPath, "utf8");

const colorLines = (Object.entries(portfolioThemeColors) as [string, string][]).map(
  ([key, value]) => `  --color-${key}: ${value};`,
);
css = replaceBlock(css, "COLORS", colorLines);

const zIndexLines = (Object.entries(zIndexTokens) as [string, number][]).map(
  ([key, value]) => `  --z-index-${key}: ${value};`,
);
css = replaceBlock(css, "Z-INDEX", zIndexLines);

const containerLines = [`  --container-content: ${styleTokens.layout.maxContentWidth};`];
css = replaceBlock(css, "CONTAINER", containerLines);

writeFileSync(cssPath, css);
console.log(
  `generate-theme-css: wrote ${colorLines.length} color tokens, ${zIndexLines.length} z-index tokens, and ${containerLines.length} container token(s) to globals.css`,
);
