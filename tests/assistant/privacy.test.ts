// Fails if a phone number, email address or demo password can reach a visitor
// through anything the assistant says: indexed facts, answers, tour text,
// pitches or tool output.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { profile, type ProfileData } from "../../src/data/profile.ts";
import { createAssistantCore } from "../../src/assistant/core.ts";
import { buildKnowledge, redactSensitive } from "../../src/assistant/knowledge.ts";
import { AUDIENCES, buildPitch } from "../../src/assistant/skills/pitch.ts";
import { buildTourStops } from "../../src/assistant/skills/tour.ts";

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE_RUN = /\+?\d[\d\s().-]{7,}\d/g;

/** Every string the assistant can show for a given profile. */
function publicSurface(p: ProfileData): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const c of buildKnowledge(p)) out.push({ where: `chunk ${c.id}`, text: [c.title, c.text, ...c.tags].join("\n") });
  for (const s of buildTourStops(p)) out.push({ where: `tour ${s.id}`, text: `${s.title}\n${s.narration}` });
  for (const a of AUDIENCES) {
    const pitch = buildPitch(p, a);
    out.push({ where: `pitch ${a}`, text: [pitch.text, ...pitch.points, ...pitch.actions.map((x) => `${x.label} ${x.href ?? ""}`)].join("\n") });
  }

  const core = createAssistantCore(p);
  const tools: [string, Record<string, unknown>][] = [
    ["get_contact", {}],
    ["list_projects", {}],
    ["get_education", {}],
    ["get_certifications", {}],
    ...p.projects.map((proj): [string, Record<string, unknown>] => ["get_project", { name: proj.title }]),
  ];
  for (const [name, args] of tools) out.push({ where: `tool ${name} ${JSON.stringify(args)}`, text: JSON.stringify(core.runTool(name, args)) });

  for (const q of ["What is his phone number?", "What's his email?", "How do I contact him?", "What's the CloudTasks demo password?", "Can I log in to CloudTasks?"]) {
    out.push({ where: `answer "${q}"`, text: core.ask(q).answer });
  }
  return out;
}

function leaks(p: ProfileData, text: string): string[] {
  const found: string[] = [];
  const phoneDigits = p.contact.phone.href.replace(/\D/g, "").slice(-10);
  if (phoneDigits && text.replace(/\D/g, "").includes(phoneDigits)) found.push("phone number");
  for (const run of text.match(PHONE_RUN) ?? []) {
    if (run.replace(/\D/g, "").length >= 10) found.push(`phone-like "${run}"`);
  }
  const email = text.match(EMAIL);
  if (email) found.push(`email "${email[0]}"`);
  for (const proj of p.projects) {
    if (proj.demo && proj.demo.password.length >= 4 && text.includes(proj.demo.password)) found.push(`${proj.title} demo password`);
  }
  return found;
}

function assertNoLeaks(p: ProfileData) {
  const problems = publicSurface(p).flatMap(({ where, text }) => leaks(p, text).map((l) => `${where}: ${l}`));
  assert.deepEqual(problems, []);
}

describe("privacy", () => {
  test("nothing the assistant shows contains a phone number, email or demo password", () => {
    assertNoLeaks(profile);
  });

  test("the leak check itself catches each kind of leak", () => {
    assert.ok(leaks(profile, `call ${profile.contact.phone.display}`).includes("phone number"));
    assert.ok(leaks(profile, "write to someone@example.org").some((l) => l.startsWith("email")));
    const demo = profile.projects.find((proj) => proj.demo)!.demo!;
    assert.ok(leaks(profile, `password ${demo.password}`).some((l) => l.includes("demo password")));
  });

  test("sensitive values that slip into the profile's prose are still kept out", () => {
    const planted: ProfileData = structuredClone(profile);
    const demo = planted.projects.find((proj) => proj.demo)!.demo!;
    const secrets = ` Call ${planted.contact.phone.display}, email someone@example.org, password ${demo.password}.`;
    planted.about += secrets;
    planted.projects[0].highlights![0] += secrets;
    planted.career[0].description += secrets;
    planted.services[0].description += secrets;
    planted.contact.focus[0] += secrets;
    assertNoLeaks(planted);
  });

  test("redaction keeps ordinary numbers", () => {
    assert.equal(redactSensitive("call +91 98765 43210 today"), "call [redacted] today");
    assert.equal(redactSensitive("mail a.b+c@mail.example.co.uk now"), "mail [redacted] now");
    assert.equal(redactSensitive("7,400+ LOC, 38 endpoints, CGPA 8.39/10"), "7,400+ LOC, 38 endpoints, CGPA 8.39/10");
    assert.equal(redactSensitive("Aug 2023 - 2026, youtube.com/@devanshlamba"), "Aug 2023 - 2026, youtube.com/@devanshlamba");
  });
});

describe("résumé link", () => {
  test("is configured in one place: no other source file hardcodes a PDF path", () => {
    const root = join(import.meta.dirname, "../../src");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && /\.pdf\b/i.test(readFileSync(path, "utf8"))) offenders.push(relative(root, path));
      }
    };
    walk(root);
    assert.deepEqual(offenders, ["data/profile.ts".replace("/", process.platform === "win32" ? "\\" : "/")]);
  });

  test("an empty value hides every assistant résumé link", () => {
    const p: ProfileData = structuredClone(profile);
    p.resume = "";
    const surface = publicSurface(p).map((s) => s.text).join("\n");
    assert.doesNotMatch(surface, /\.pdf/i);
    assert.doesNotMatch(surface, /résumé link/i);
  });
});
