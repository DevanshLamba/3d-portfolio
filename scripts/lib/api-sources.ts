// The files bundled into api/chat.js, hashed so a test can tell when the
// committed bundle no longer matches its sources.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".ts")) out.push(path);
  }
}

export function apiSources(root: string): string[] {
  const files: string[] = [join(root, "server/chat.ts"), join(root, "src/data/profile.ts")];
  walk(join(root, "src/assistant"), files);
  return [...new Set(files)].sort();
}

export function sourceHash(root: string): string {
  const hash = createHash("sha256");
  for (const file of apiSources(root)) {
    hash.update(relative(root, file).split("\\").join("/"));
    // Line endings differ between checkouts; the code doesn't.
    hash.update(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  }
  return hash.digest("hex").slice(0, 16);
}
