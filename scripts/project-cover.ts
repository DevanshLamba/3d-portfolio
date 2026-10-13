// Builds a case-file style cover for a project from src/data/profile.ts and
// renders it to public/images/<id>-cover.png (1200x627, like the others).
//
//   npm run cover -- leadloop

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { profile } from "../src/data/profile.ts";
import { esc, findBrowser, screenshot } from "./lib/browser.ts";

const id = process.argv[2];
const project = profile.projects.find((p) => p.id === id);
if (!project) {
  console.error(`Unknown project "${id}". Known: ${profile.projects.map((p) => p.id).join(", ")}`);
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const htmlPath = join(root, "og", `${project.id}-cover.html`);
const pngPath = join(root, "public", "images", `${project.id}-cover.png`);
const index = profile.projects.indexOf(project) + 1;
const status = project.deployed === false ? "In development" : project.status === "live" ? "Live" : project.status === "learning" ? "Learning build" : "In development";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(project.title)} cover</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 627px; overflow: hidden; }
  body { background: #241f1a; color: #f1e6cf; font-family: "Geist", system-ui, sans-serif; position: relative; }
  body::after { content: ""; position: absolute; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 3px),
                radial-gradient(ellipse at 70% 30%, rgba(240,189,130,.22), transparent 60%); }
  .wrap { position: absolute; inset: 56px 64px; display: flex; flex-direction: column; }
  .top { display: flex; justify-content: space-between; align-items: center; font: 600 16px "IBM Plex Mono", monospace; letter-spacing: 2px; text-transform: uppercase; color: rgba(241,230,207,.7); }
  .stamp { color: #e08a73; border: 3px solid #e08a73; border-radius: 6px; padding: 6px 14px; transform: rotate(-6deg); }
  h1 { margin: 34px 0 6px; font-size: 92px; line-height: 1; letter-spacing: -1px; color: #f0bd82; text-shadow: 0 0 22px rgba(240,189,130,.35); }
  .cat { font: 500 26px "IBM Plex Mono", monospace; color: #9ccbb8; margin-bottom: 30px; }
  .modules { display: flex; flex-wrap: wrap; gap: 12px; max-width: 900px; }
  .modules span { font: 500 17px "IBM Plex Mono", monospace; border: 1.5px solid rgba(240,189,130,.55); color: #f1e6cf; border-radius: 999px; padding: 8px 16px; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 48px; font: 500 17px "IBM Plex Mono", monospace; color: rgba(241,230,207,.65); }
  .foot span { flex: 1; max-width: 820px; }
  .foot b { color: #f0bd82; font-weight: 600; white-space: nowrap; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top"><span>Case ${String(index).padStart(2, "0")} · ${esc(project.role ?? "")}</span><span class="stamp">${esc(status)}</span></div>
    <h1>${esc(project.title)}</h1>
    <div class="cat">${esc(project.category)}</div>
    <div class="modules">${project.stack.map((s) => `<span>${esc(s)}</span>`).join("")}</div>
    <div class="foot"><span>${esc(project.summary ?? "").slice(0, 110)}${(project.summary ?? "").length > 110 ? "…" : ""}</span><b>${esc(profile.name)}</b></div>
  </div>
</body>
</html>
`;

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);
console.log(`Wrote ${htmlPath}`);
const browser = findBrowser();
if (!browser) {
  console.log("No Chrome or Edge found. Set BROWSER_PATH, or screenshot the HTML at 1200x627.");
} else {
  screenshot(browser, htmlPath, pngPath, 1200, 627);
  console.log(`Rendered ${pngPath}`);
}
