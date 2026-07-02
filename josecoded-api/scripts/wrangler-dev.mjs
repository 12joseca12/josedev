#!/usr/bin/env node
/**
 * `pnpm dev` → wrangler dev (foro en Postgres si hay SUPABASE_SERVICE_ROLE_KEY en .dev.vars).
 * `pnpm dev -- --mock` → fuerza foro en memoria (mock), sin tocar el resto de bindings.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = process.argv.slice(2);
const mock = raw.includes("--mock");
const forward = raw.filter((a) => a !== "--mock");
const args = ["exec", "wrangler", "dev", ...forward];
if (mock) {
  args.push("--var", "FORUM_USE_MOCK:true");
}

const child = spawn("pnpm", args, {
  stdio: "inherit",
  cwd: root,
  env: process.env,
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
