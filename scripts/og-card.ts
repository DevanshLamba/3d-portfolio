// Builds the link-preview card (og/card.html) from src/data/profile.ts and,
// if Chrome or Edge is installed, renders it to public/og-image.png.
//
//   npm run og
//
// Set BROWSER_PATH to point at a Chromium-based browser if it isn't found.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { profile } from "../src/data/profile.ts";

const root = resolve(import.meta.dirname, "..");
const htmlPath = join(root, "og", "card.html");
const pngPath = join(root, "public", "og-image.png");

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Headline numbers come straight from the first project's first highlight,
// e.g. "7,400+ LOC, 38 endpoints, 68 passing tests".
const lead = profile.projects[0];
const stats = [...(lead.highlights?.[0] ?? "").matchAll(/(\d[\d,]*\+?)\s+(LOC|endpoints|passing tests)/g)].map((m) => ({ value: m[1], label: m[2] }));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(profile.name)}: link preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #f1e6cf;
    color: #2e2a24;
    font-family: "Geist", system-ui, sans-serif;
    position: relative;
  }
  body::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background:
      repeating-linear-gradient(0deg, rgba(46,42,36,.04) 0 1px, transparent 1px 3px),
      radial-gradient(ellipse at center, transparent 55%, rgba(120,84,40,.18) 100%);
  }
  .glow { position: absolute; border-radius: 50%; filter: blur(70px); }
  .glow.a { width: 420px; height: 420px; background: #f0bd82; right: -80px; top: -120px; opacity: .8; }
  .glow.b { width: 360px; height: 360px; background: #9ccbb8; left: -120px; bottom: -160px; opacity: .7; }
  .file {
    position: absolute; left: 70px; top: 92px; right: 70px; bottom: 64px;
    background: #f8f0de; border: 3px solid #2e2a24; border-radius: 10px;
    box-shadow: 14px 14px 0 #e4d3b2, 14px 14px 0 3px #2e2a24;
    padding: 46px 54px;
  }
  .tab {
    position: absolute; top: -40px; left: 28px; height: 40px; padding: 0 18px;
    display: flex; align-items: center;
    font: 600 17px "IBM Plex Mono", monospace; letter-spacing: 2px; text-transform: uppercase;
    background: #f0bd82; border: 3px solid #2e2a24; border-bottom: none; border-radius: 10px 10px 0 0;
  }
  .label { font: 600 18px "IBM Plex Mono", monospace; letter-spacing: 3px; text-transform: uppercase; color: #6e6253; }
  h1 { margin: 10px 0 6px; font-size: 84px; line-height: 1; font-weight: 700; letter-spacing: -1px; }
  .headline { font: 500 30px "IBM Plex Mono", monospace; color: #d4772a; margin: 0 0 34px; }
  .stats { display: flex; gap: 18px; }
  .stat { border: 2px solid #2e2a24; border-radius: 6px; padding: 12px 18px; background: #f1e6cf; min-width: 170px; }
  .stat b { display: block; font-size: 40px; line-height: 1.05; }
  .stat span { font: 500 15px "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: 1px; color: #6e6253; }
  .projects { position: absolute; left: 54px; bottom: 34px; font: 500 19px "IBM Plex Mono", monospace; color: #6e6253; }
  .projects b { color: #2e2a24; }
  .stamp {
    position: absolute; right: 48px; top: 40px; transform: rotate(-8deg);
    font: 700 26px "IBM Plex Mono", monospace; letter-spacing: 4px; text-transform: uppercase;
    color: #b24a35; border: 4px solid #b24a35; border-radius: 6px; padding: 8px 16px; opacity: .9;
  }
  .site { position: absolute; right: 54px; bottom: 34px; font: 600 19px "IBM Plex Mono", monospace; }
</style>
</head>
<body>
  <div class="glow a"></div>
  <div class="glow b"></div>
  <div class="file">
    <div class="tab">Case file · DL-0001</div>
    <div class="stamp">Verified</div>
    <div class="label">${esc(profile.role)} · ${esc(profile.location.split(",")[0])}</div>
    <h1>${esc(profile.name)}</h1>
    <p class="headline">${esc(profile.headline)}</p>
    <div class="stats">
      ${stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("\n      ")}
    </div>
    <div class="projects">Projects: ${profile.projects.map((p) => `<b>${esc(p.title)}</b>`).join(" · ")}</div>
    <div class="site">${esc(profile.site.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</div>
  </div>
</body>
</html>
`;

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);
console.log(`Wrote ${htmlPath}`);

const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((p): p is string => Boolean(p));
const browser = candidates.find((p) => existsSync(p));

if (!browser) {
  console.log("No Chrome or Edge found. Set BROWSER_PATH, or open og/card.html at 1200x630 and save a screenshot as public/og-image.png.");
} else {
  execFileSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1200,630",
    "--virtual-time-budget=4000",
    `--screenshot=${pngPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  console.log(`Rendered ${pngPath}`);
}
