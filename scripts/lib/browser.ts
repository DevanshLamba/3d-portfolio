// Finds a local Chromium-based browser and uses it headless to turn an HTML
// file into a PNG screenshot or a PDF. Shared by the card, cover and résumé
// scripts. Set BROWSER_PATH if the browser isn't found.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function findBrowser(): string | null {
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
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function screenshot(browser: string, htmlPath: string, pngPath: string, width: number, height: number) {
  execFileSync(
    browser,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${height}`, "--virtual-time-budget=4000", `--screenshot=${pngPath}`, pathToFileURL(htmlPath).href],
    { stdio: "ignore" }
  );
}

export function printPdf(browser: string, htmlPath: string, pdfPath: string) {
  execFileSync(
    browser,
    ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--print-to-pdf-no-header", "--virtual-time-budget=4000", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href],
    { stdio: "ignore" }
  );
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
