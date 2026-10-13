// Fails if a phone number, an email address or a demo password can reach a
// visitor: through anything the assistant says (indexed facts, answers, tour,
// pitches, tool output) or through the text the site itself renders.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { profile, type ProfileData } from "../../src/data/profile.ts";
import { createAssistantCore } from "../../src/assistant/core.ts";
import { buildKnowledge, redactSensitive } from "../../src/assistant/knowledge.ts";
import { AUDIENCES, buildPitch } from "../../src/assistant/skills/pitch.ts";
import { buildTourStops } from "../../src/assistant/skills/tour.ts";
import { phoneLeaks } from "../helpers/phone.ts";

const ROOT = join(import.meta.dirname, "../..");
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;

/** Every string the assistant can show for a given profile. */
function assistantSurface(p: ProfileData): { where: string; text: string }[] {
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

  for (const q of [
    "What is his phone number?",
    "Can I call him?",
    "What's his WhatsApp?",
    "What's his email?",
    "How do I contact him?",
    "What's the CloudTasks demo password?",
    "Can I log in to CloudTasks?",
  ]) {
    out.push({ where: `answer "${q}"`, text: core.ask(q).answer });
  }
  return out;
}

function leaks(p: ProfileData, text: string): string[] {
  const found = phoneLeaks(text);
  const email = text.match(EMAIL);
  if (email) found.push(`email "${email[0]}"`);
  for (const proj of p.projects) {
    if (proj.demo && proj.demo.password.length >= 4 && text.includes(proj.demo.password)) found.push(`${proj.title} demo password`);
  }
  return found;
}

function assertNoLeaks(p: ProfileData) {
  const problems = assistantSurface(p).flatMap(({ where, text }) => leaks(p, text).map((l) => `${where}: ${l}`));
  assert.deepEqual(problems, []);
}

/** Text files whose contents end up on the page or in the repo's docs. */
function renderedSources(): string[] {
  const files: string[] = [];
  const walk = (dir: string, exts: string[]) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, exts);
      else if (exts.includes(extname(name).toLowerCase())) files.push(path);
    }
  };
  // CSS is skipped: it renders no text, and z-indexes like 9999999999 look like numbers.
  walk(join(ROOT, "src/components"), [".tsx", ".ts"]);
  walk(join(ROOT, "src/data"), [".ts"]);
  walk(join(ROOT, "og"), [".html"]);
  walk(join(ROOT, "public"), [".html", ".txt", ".json", ".xml", ".svg", ".webmanifest"]);
  for (const f of ["index.html", "README.md", ".env.example", "api/contact.ts"]) files.push(join(ROOT, f));
  return files;
}

describe("privacy: the assistant", () => {
  test("nothing the assistant shows contains a phone number, email or demo password", () => {
    assertNoLeaks(profile);
  });

  test("the leak check catches each kind of leak", () => {
    assert.ok(phoneLeaks("call +91 98765 43210").length > 0);
    assert.ok(phoneLeaks("ring 9876543210 anytime").length > 0);
    assert.ok(phoneLeaks("ring 98765-43210").length > 0);
    assert.ok(phoneLeaks('<a href="tel:123">x</a>').length > 0);
    assert.ok(leaks(profile, "write to someone@example.org").some((l) => l.startsWith("email")));
    const demo = profile.projects.find((proj) => proj.demo)!.demo!;
    assert.ok(leaks(profile, `password ${demo.password}`).some((l) => l.includes("demo password")));
    // Ordinary numbers are fine.
    assert.deepEqual(phoneLeaks("7,400+ LOC, 38 endpoints, 68 passing tests, CGPA 8.39/10, Aug 2023 - Present"), []);
  });

  test("sensitive values that slip into the profile's prose are still kept out", () => {
    const planted: ProfileData = structuredClone(profile);
    const demo = planted.projects.find((proj) => proj.demo)!.demo!;
    const secrets = ` Call +91 98765 43210, email someone@example.org, password ${demo.password}.`;
    planted.about += secrets;
    planted.projects[0].highlights![0] += secrets;
    planted.career[0].description += secrets;
    planted.services[0].description += secrets;
    planted.contact.focus[0] += secrets;
    planted.notes = [{ id: "n", title: "Note", text: `Reach him on 98765 43210 or someone@example.org.`, tags: [] }];
    assertNoLeaks(planted);
  });

  test("the displayed email is never indexed", () => {
    const text = buildKnowledge(profile).map((c) => c.text).join("\n");
    assert.ok(!text.includes(profile.contact.email.display));
  });

  test("redaction keeps ordinary numbers", () => {
    assert.equal(redactSensitive("call +91 98765 43210 today"), "call [redacted] today");
    assert.equal(redactSensitive("mail a.b+c@mail.example.co.uk now"), "mail [redacted] now");
    assert.equal(redactSensitive("7,400+ LOC, 38 endpoints, CGPA 8.39/10"), "7,400+ LOC, 38 endpoints, CGPA 8.39/10");
    assert.equal(redactSensitive("Aug 2023 - 2026, youtube.com/@devanshlamba"), "Aug 2023 - 2026, youtube.com/@devanshlamba");
  });
});

describe("privacy: the site", () => {
  test("no rendered source, doc or config contains a phone number or tel: link", () => {
    // Demo passwords are shown on purpose (and kept out of the index by the tests above).
    const demoPasswords = profile.projects.flatMap((proj) => (proj.demo ? [proj.demo.password] : []));
    const problems = renderedSources().flatMap((file) => {
      let text = readFileSync(file, "utf8");
      for (const pw of demoPasswords) text = text.split(pw).join("");
      return phoneLeaks(text).map((l) => `${relative(ROOT, file)}: ${l}`);
    });
    assert.deepEqual(problems, []);
  });

  test("the profile has no phone field at all", () => {
    assert.ok(!("phone" in profile.contact));
  });
});

describe("résumé link", () => {
  test("is configured in one place: no other source file hardcodes a PDF path", () => {
    const root = join(ROOT, "src");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && /\.pdf\b/i.test(readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, ""))) offenders.push(relative(root, path));
      }
    };
    walk(root);
    assert.deepEqual(offenders, []);
  });

  test("stays hidden until a phone-free copy is provided at a real path", () => {
    if (!profile.resume) return;
    assert.notEqual(profile.resume, "/Devansh_Lamba_Resume.pdf", "that PDF contains a phone number");
    assert.ok(existsSync(join(ROOT, "public", profile.resume.replace(/^\//, ""))), `public${profile.resume} is missing`);
  });

  test("an empty value hides every assistant résumé link", () => {
    const p: ProfileData = structuredClone(profile);
    p.resume = "";
    const surface = assistantSurface(p).map((s) => s.text).join("\n");
    assert.doesNotMatch(surface, /\.pdf/i);
    assert.doesNotMatch(surface, /résumé link/i);
  });
});
