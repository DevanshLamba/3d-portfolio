// Builds the résumé from src/data/profile.ts, so it never drifts from the
// site, and prints it to public/resume.pdf with a local Chrome or Edge.
// There is no phone number in the profile, so there is none on the résumé.
//
//   npm run resume

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isPlaceholder, profile, type Project } from "../src/data/profile.ts";
import { esc, findBrowser, printPdf } from "./lib/browser.ts";

const root = resolve(import.meta.dirname, "..");
const htmlPath = join(root, "resume", "resume.html");
const pdfPath = join(root, "public", "resume.pdf");

const p = profile;
const lookingFor = p.notes.find((n) => n.id === "looking-for")?.text;
const where = p.notes
  .find((n) => n.id === "location")
  ?.text.match(/open to roles in ([^.]+)/)?.[1]
  .replace(/,?\s*depending on the offer/, "")
  .replace(/\bin\s+/g, "");
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const link = (href: string, text = bare(href)) => (isPlaceholder(href) ? "" : `<a href="${esc(href)}">${esc(text)}</a>`);
const social = (id: string) => p.contact.socials.find((s) => s.id === id);

const lead = p.projects[0];
const leadStats = [...(lead.highlights?.[0] ?? "").matchAll(/(\d[\d,]*\+?)\s+(LOC|endpoints|passing tests)/g)].map((m) => `${m[1]} ${m[2]}`);
const founded = p.projects.filter((proj) => /founder/i.test(proj.role ?? ""));
const openSource = p.projects.filter((proj) => proj.repo?.visibility === "public" && proj.repo.license);
const edu = p.education[0];
const leetcode = p.achievements.find((a) => a.id === "leetcode");

function status(proj: Project): string {
  if (proj.deployed === false) return "In development";
  if (proj.repo?.visibility === "public" && proj.repo.license) return `Open source · ${proj.repo.license}`;
  if (proj.status === "live") return "Live";
  if (proj.status === "learning") return "Learning build";
  return "In development";
}

function projectLinks(proj: Project): string {
  const links = (proj.links ?? []).filter((l) => !isPlaceholder(l.href)).map((l) => link(l.href, l.label));
  if (!links.length && !isPlaceholder(proj.link)) links.push(link(proj.link, "Site"));
  if (proj.repo?.visibility === "private") links.push("<span>Code private · walkthrough on request</span>");
  return links.join(" · ");
}

function projectBlock(proj: Project): string {
  const bullets = proj.highlights?.length ? proj.highlights : [proj.summary ?? "", ...(proj.learned ?? []).slice(0, 2)].filter(Boolean);
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
    <ul>${bullets.map((b) => `<li>${esc(b.replace(/\.$/, ""))}.</li>`).join("")}</ul>
    ${proj.planned?.length ? `<p class="planned"><b>Planned, not shipped:</b> ${proj.planned.map(esc).join("; ")}.</p>` : ""}
  </article>`;
}

const summary = [
  `Backend engineer who ships systems end to end. Built ${esc(lead.title)} solo (${esc(lead.category)}: ${esc(leadStats.join(", "))})`,
  openSource.length ? `; builds ${openSource.map((o) => `${esc(o.title)} (${esc(o.category)}, ${esc(o.repo!.license!)})`).join(", ")}` : "",
  founded.length ? `; and founded ${founded.map((f) => `${esc(f.title)} (${esc(f.category)})`).join(" and ")}.` : ".",
  ` Works across RAG, agentic tool-calling, provider-agnostic LLM layers, multi-tenant SaaS, API security and cloud deployment.`,
  lookingFor ? ` ${esc(lookingFor.replace(/^He is looking/, "Looking"))}` : "",
].join("");

const numbers = [
  ...leadStats.map((s) => ({ value: s.split(" ")[0], label: `${s.split(" ").slice(1).join(" ")} · ${lead.title}` })),
  { value: String(founded.length), label: "startups founded" },
  openSource.length ? { value: "OSS", label: `${openSource[0].title} · ${openSource[0].repo!.license}` } : null,
  leetcode ? { value: leetcode.title.match(/\d+\+?/)?.[0] ?? "", label: "LeetCode problems" } : null,
  edu?.detail ? { value: edu.detail.replace(/^CGPA:\s*/, ""), label: "CGPA" } : null,
].filter((n): n is { value: string; label: string } => Boolean(n?.value));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(p.name)} · Résumé</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 13mm 14mm 13mm 14mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 10pt/1.45 "Geist", system-ui, sans-serif; color: #2e2a24; }
  a { color: inherit; text-decoration: none; border-bottom: 1px solid #e0b98a; }
  .mono, .label, .meta, .stack, .links, .contact, .numbers span { font-family: "IBM Plex Mono", ui-monospace, monospace; }

  .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #2e2a24; padding-bottom: 8px; }
  h1 { margin: 0; font-size: 27pt; line-height: 1; letter-spacing: -0.5px; }
  .title { margin: 5px 0 0; font: 600 11pt "IBM Plex Mono", monospace; color: #c46a1f; letter-spacing: 0.3px; }
  .stamp { font: 700 8pt "IBM Plex Mono", monospace; letter-spacing: 1.5px; text-transform: uppercase; color: #b24a35; border: 2px solid #b24a35; border-radius: 4px; padding: 4px 8px; transform: rotate(-4deg); white-space: nowrap; }
  .contact { margin: 7px 0 0; font-size: 8.4pt; color: #4e453a; display: flex; flex-wrap: wrap; gap: 4px 14px; }

  .summary { margin: 10px 0 8px; font-size: 10pt; }
  .numbers { display: grid; grid-template-columns: repeat(${numbers.length}, 1fr); gap: 6px; margin: 0 0 4px; }
  .numbers div { border: 1.3px solid #2e2a24; border-radius: 4px; padding: 5px 7px; background: #fbf5ea; }
  .numbers b { display: block; font-size: 13.5pt; line-height: 1.1; }
  .numbers span { font-size: 6.8pt; text-transform: uppercase; letter-spacing: 0.4px; color: #6e6253; }

  h2 { margin: 12px 0 5px; font: 600 8.6pt "IBM Plex Mono", monospace; letter-spacing: 2px; text-transform: uppercase; color: #6e6253; display: flex; align-items: center; gap: 8px; }
  h2::after { content: ""; flex: 1; border-top: 1px solid #d8c7a6; }

  .project { break-inside: avoid; margin: 0 0 8px; padding-left: 9px; border-left: 2.5px solid #e8a066; }
  .project header { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .project h3 { margin: 0; font-size: 11pt; }
  .project .cat { font-weight: 500; color: #4e453a; font-size: 9.5pt; }
  .meta { margin: 1px 0 0; font-size: 7.8pt; color: #6e6253; }
  .tag { color: #2f6e5c; font-weight: 600; }
  .links { margin: 0; font-size: 7.6pt; text-align: right; white-space: nowrap; color: #4e453a; }
  .stack { margin: 2px 0 2px; font-size: 7.8pt; color: #c46a1f; }
  .project ul { margin: 2px 0 0; padding-left: 15px; }
  .project li { margin: 0 0 1.5px; font-size: 9.2pt; }
  .planned { margin: 3px 0 0; font-size: 8.6pt; color: #6e6253; }

  .grid2 { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0 22px; }
  .skills p { margin: 0 0 3px; font-size: 9pt; }
  .skills b { font: 600 7.8pt "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: 0.5px; color: #6e6253; margin-right: 4px; }
  .plain { margin: 0 0 3px; font-size: 9pt; }
  .plain small { color: #6e6253; font-family: "IBM Plex Mono", monospace; font-size: 7.8pt; }
  ul.plain-list { margin: 0; padding-left: 15px; font-size: 9pt; }
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

  <p class="summary">${summary}</p>
  <div class="numbers">${numbers.map((n) => `<div><b>${esc(n.value)}</b><span>${esc(n.label)}</span></div>`).join("")}</div>

  <h2>Selected work</h2>
  ${p.projects.map(projectBlock).join("")}

  <div class="grid2">
    <div class="skills">
      <h2>Technical skills</h2>
      ${p.skills.map((g) => `<p><b>${esc(g.label)}</b>${g.items.map(esc).join(", ")}</p>`).join("")}
    </div>
    <div>
      <h2>Education</h2>
      ${p.education.map((e) => `<p class="plain"><b>${esc(e.degree)}</b><br />${esc(e.institution)}, ${esc(e.location)}<br /><small>${esc(e.period)}${e.detail ? ` · ${esc(e.detail)}` : ""}</small></p>`).join("")}
      <h2>Certifications</h2>
      <ul class="plain-list">${p.certifications.map((c) => `<li>${esc(c.name)} <small>· ${esc(c.issuer)}</small></li>`).join("")}</ul>
      <h2>Achievements</h2>
      <ul class="plain-list">${p.achievements.map((a) => `<li><b>${esc(a.title)}</b>: ${esc(a.detail.replace(/\.$/, ""))}.</li>`).join("")}</ul>
    </div>
  </div>
</body>
</html>
`;

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);
console.log(`Wrote ${htmlPath}`);
const browser = findBrowser();
if (!browser) {
  console.log("No Chrome or Edge found. Set BROWSER_PATH, or open resume/resume.html and print it to public/resume.pdf.");
} else {
  printPdf(browser, htmlPath, pdfPath);
  console.log(`Printed ${pdfPath}`);
}
