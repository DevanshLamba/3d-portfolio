// One-page résumé in the same theme as the full one (scripts/resume.ts).
// Facts come from src/data/profile.ts; the selection and tightened wording
// for one page live here. Prints to public/assets/Devansh_Lamba_Resume.pdf.
// There is no phone number in the profile, so there is none here.
//
//   npm run resume:one-page

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isPlaceholder, profile, type Project } from "../src/data/profile.ts";
import { esc, findBrowser, printPdf } from "./lib/browser.ts";
import { resumeCss } from "./lib/resume-theme.ts";

const root = resolve(import.meta.dirname, "..");
const htmlPath = join(root, "resume", "resume-one-page.html");
const pdfPath = join(root, "public", "assets", "Devansh_Lamba_Resume.pdf");

const p = profile;
const byId = (id: string) => {
  const proj = p.projects.find((x) => x.id === id);
  if (!proj) throw new Error(`Missing project ${id}`);
  return proj;
};
const where = p.notes
  .find((n) => n.id === "location")
  ?.text.match(/open to roles in ([^.]+)/)?.[1]
  .replace(/,?\s*depending on the offer/, "")
  .replace(/\bin\s+/g, "");
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const link = (href: string, text = bare(href)) => (isPlaceholder(href) ? "" : `<a href="${esc(href)}">${esc(text)}</a>`);
const social = (id: string) => p.contact.socials.find((s) => s.id === id);

function status(proj: Project): string {
  if (proj.deployed === false) return "In development";
  if (proj.repo?.visibility === "public" && proj.repo.license) return `Open source · ${proj.repo.license}`;
  if (proj.status === "live") return "Live";
  if (proj.status === "learning") return "Learning build";
  return "In development";
}

function projectLinks(proj: Project): string {
  const links = (proj.links ?? []).filter((l) => !isPlaceholder(l.href)).map((l) => link(l.href, l.label.replace(/\s*\(.*\)$/, "")));
  if (proj.repo?.visibility === "private") links.push("<span>Code private · walkthrough on request</span>");
  return links.join(" · ");
}

function block(proj: Project, bullets: string[]): string {
  return `
  <article class="project">
    <header>
      <div>
        <h3>${esc(proj.title)} <span class="cat">${esc(proj.category.replace(/^Learning Project — /, ""))}</span></h3>
        <p class="meta">${esc(proj.role ?? "")}${proj.period ? ` · ${esc(proj.period)}` : ""} · <span class="tag">${esc(status(proj))}</span></p>
      </div>
      <p class="links">${projectLinks(proj)}</p>
    </header>
    <p class="stack">${proj.stack.map(esc).join(" · ")}</p>
    <ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
  </article>`;
}

const siliqo = byId("siliqo");
const vayris = byId("vayris");
const ordo = byId("ordo");
const leadloop = byId("leadloop");
const cloudtasks = byId("cloudtasks");
// Keyword row under the summary; each item is backed by a bullet below.
const FOCUS = [
  "Agentic AI",
  "RAG / pgvector",
  "Multi-tenant SaaS",
  "LLM provider abstraction",
  "API security",
  "Cost-aware LLM design",
];

// Shorter names for long skill and certification entries; the entries themselves are unchanged.
const SHORT: Record<string, string> = {
  "Retrieval-Augmented Generation (RAG)": "RAG",
  "Server-Sent Events (SSE)": "SSE",
  "AES-256 Encryption": "AES-256",
  "JWT Auth": "JWT",
  "HMAC-Signed Webhooks": "HMAC webhooks",
  "Data Structures & Algorithms": "DSA",
};

// Selection and tightened wording for one page. Every bullet restates a
// highlight from profile.ts (some merged, some shortened); nothing is added.
const bullets = {
  siliqo: [
    "Shipped solo a multi-tenant agentic support API (7,400+ LOC, 38 endpoints, 68 passing tests) with RAG, tool-calling and automatic human escalation, embedded via a zero-build JS widget streaming over SSE.",
    "Removed LLM vendor lock-in: one streaming layer over OpenAI, Anthropic and Google, switching providers by config.",
    "Secured tenants with Stripe-style two-key auth (domain-locked public + secret key) and AES-256-GCM encryption.",
    "Hardened tool-calling with HMAC-signed webhooks, SSRF protection and a bounded loop; RAG on pgvector (HNSW).",
  ],
  vayris: [
    "Tri-path routing: deterministic OS commands skip the LLM; fast and deep agentic paths share one tool registry.",
    "Grounded the agent in local context with RAG, and added guardrails that block unsafe or irreversible actions.",
    "Released open source (Apache 2.0) with MCP support; runs on the user's own API key or a fully local model.",
  ],
  ordo: [
    "Leads architecture and the full-stack build of a platform linking local retailers, customers and riders.",
    "Building secure REST APIs (auth, orders, inventory) and a React Native app with real-time order tracking.",
  ],
  leadloop: [
    "Designing a restaurant's digital department: bookings, orders, payments, marketing and revenue in one dashboard.",
    "Cost-aware by design: plain code first, the cheapest suitable LLM only where needed; tier-based features.",
  ],
};

const cloudLine = "OpenTofu on Azure, Docker + Caddy HTTPS, argon2id, CSRF, rate limiting, 41 tests.";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(p.name)} · Résumé</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>
${resumeCss(0)}
  /* One page: the same theme, with the summary, skills, education and
     certifications laid out as compact rows. */
  .summary { margin: 9px 0 2px; }
  .summary span { display: block; }
  .focus { margin: 4px 0 0; font-size: 8.6pt; color: #4e453a; }
  .focus b { font: 600 7.8pt "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: 0.5px; color: #c46a1f; margin-right: 6px; }
  .startups-note { margin: 0 0 5px; font: 500 7.8pt "IBM Plex Mono", monospace; color: #6e6253; }
  .oneline { break-inside: avoid; margin: 0 0 6px; padding-left: 9px; border-left: 2.5px solid #e8a066; display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .oneline p { margin: 0; font-size: 9.2pt; }
  .oneline .tag { font-size: 7.8pt; }
  .oneline b { font-size: 10pt; }
  .skills-rows p { margin: 0 0 2px; font-size: 9pt; }
  .skills-rows b { font: 600 7.8pt "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: 0.5px; color: #6e6253; margin-right: 6px; }
  .skills-rows small { color: #6e6253; font-size: 7.8pt; }
</style>
</head>
<body>
  <section class="top">
    <div>
      <h1>${esc(p.name)}</h1>
      <p class="title">AI · Backend · Automation Engineer</p>
      <p class="contact">
        <span>${esc(p.location.split(",")[0])}, India${where ? ` · open to ${esc(where)}` : ""}</span>
        ${link(p.contact.email.href, p.contact.email.display)}
        ${social("linkedin") ? link(social("linkedin")!.href) : ""}
        ${social("github") ? link(social("github")!.href) : ""}
        ${link(p.site)}
      </p>
    </div>
    <span class="stamp">Open to work</span>
  </section>

  <p class="summary">
    <span>Backend engineer shipping production AI systems: multi-tenant SaaS, RAG, agentic tool-calling and API security.</span>
    <span>Seeking full-time or internship roles in AI / backend engineering.</span>
  </p>
  <p class="focus"><b>Focus</b>${FOCUS.map(esc).join(" · ")}</p>

  <h2>Selected work</h2>
  ${block(siliqo, bullets.siliqo)}
  ${block(vayris, bullets.vayris)}

  <h2>Startups</h2>
  ${block(ordo, bullets.ordo)}
  ${block(leadloop, bullets.leadloop)}

  <h2>Also built</h2>
  <div class="oneline">
    <p><b>${esc(cloudtasks.title)}</b> <span class="tag mono">${esc(status(cloudtasks))}</span> · ${cloudLine}</p>
    <p class="links">${projectLinks(cloudtasks)}</p>
  </div>

  <h2>Technical skills</h2>
  <div class="skills-rows">
    ${p.skills.map((g) => `<p><b>${esc(g.label)}</b>${g.items.map((i) => esc(SHORT[i] ?? i)).join(", ")}</p>`).join("\n    ")}
  </div>

  <h2>Education &amp; certifications</h2>
  <div class="skills-rows">
    ${p.education.map((e) => `<p><b>Education</b>${esc(e.degree.replace(/^Bachelor of Technology in /, "B.Tech, "))}, ${esc(e.institution)} <small>· ${esc(e.period)}${e.detail ? ` · ${esc(e.detail)}` : ""}</small></p>`).join("")}
    <p><b>Certifications</b>${p.certifications.map((c) => `${esc(SHORT[c.name] ?? c.name)} <small>(${esc(c.issuer)})</small>`).join(" · ")}</p>
  </div>
</body>
</html>
`;

mkdirSync(dirname(htmlPath), { recursive: true });
mkdirSync(dirname(pdfPath), { recursive: true });
writeFileSync(htmlPath, html);
console.log(`Wrote ${htmlPath}`);
const browser = findBrowser();
if (!browser) {
  console.log("No Chrome or Edge found. Set BROWSER_PATH, or open resume/resume-one-page.html and print it to public/assets/Devansh_Lamba_Resume.pdf.");
} else {
  printPdf(browser, htmlPath, pdfPath);
  console.log(`Printed ${pdfPath}`);
}
