import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { profile } from "../../src/data/profile.ts";
import { createJobMatcher, looksLikeJobDescription, parseJobDescription } from "../../src/assistant/skills/jobMatcher.ts";

const matcher = createJobMatcher(profile);

const JD = `Backend Engineer, AI Platform

About the role
We're looking for a backend engineer to build the APIs behind our LLM products. You will own services end to end.

Requirements:
- 3+ years of experience with Python and FastAPI
- Strong PostgreSQL skills; experience with vector databases (Pinecone preferred)
- Experience building RAG pipelines and AI agents with tool calling
- Git and Rust

Nice to have:
- Kubernetes
- Django
`;

describe("job description parsing", () => {
  const parsed = parseJobDescription(JD);
  const req = (id: string) => parsed.skills.get(id)?.required;

  test("bulleted requirements are required", () => {
    assert.equal(req("python"), true);
    assert.equal(req("postgresql"), true);
    assert.equal(req("rag"), true);
    assert.equal(req("agents"), true);
  });

  test("a 'Nice to have' section makes its skills optional", () => {
    assert.equal(req("kubernetes"), false);
    assert.equal(req("django"), false);
  });

  test("'(X preferred)' makes only X optional, not the rest of the line", () => {
    assert.equal(req("vector-saas"), false);
    assert.equal(req("vectordb"), true);
  });

  test("required anywhere wins over optional elsewhere", () => {
    const p = parseJobDescription("Requirements:\n- Docker\nNice to have:\n- Docker and AWS");
    assert.equal(p.skills.get("docker")?.required, true);
    assert.equal(p.skills.get("aws")?.required, false);
  });

  test("years of experience are extracted", () => {
    assert.equal(parsed.years, 3);
  });
});

describe("job matching labels", () => {
  const result = matcher.match(JD);
  const row = (id: string) => result.rows.find((r) => r.skillId === id);

  test("skills used in projects are Shipped, with the project as evidence", () => {
    assert.equal(row("python")?.status, "shipped");
    assert.equal(row("fastapi")?.status, "shipped");
    assert.equal(row("fastapi")?.evidence[0].title, "CloudTasks");
    assert.equal(row("vectordb")?.status, "shipped");
    assert.match(row("vectordb")!.evidence.map((e) => e.quote).join(" "), /pgvector/);
  });

  test("skills only on the supporting list are Listed", () => {
    assert.equal(row("git")?.status, "listed");
  });

  test("unproven skills next to proven ones are Transferable", () => {
    assert.equal(row("kubernetes")?.status, "transferable");
    assert.equal(row("kubernetes")?.evidence[0].kind, "related");
    assert.equal(row("vector-saas")?.status, "transferable");
    assert.equal(row("django")?.status, "transferable");
  });

  test("skills with no support are Gaps", () => {
    assert.equal(row("rust")?.status, "gap");
    assert.equal(row("rust")?.evidence.length, 0);
    assert.match(result.summary, /Required gaps: Rust/);
  });

  test("score, counts and notes are consistent", () => {
    assert.ok(result.score > 0 && result.score <= 100);
    const total = Object.values(result.counts).reduce((a, b) => a + b, 0);
    assert.equal(total, result.rows.length);
    assert.ok(result.notes.some((n) => n.includes("3+ years")));
  });

  test("required rows are listed before optional ones", () => {
    const firstOptional = result.rows.findIndex((r) => !r.required);
    assert.ok(firstOptional > 0);
    assert.ok(result.rows.slice(firstOptional).every((r) => !r.required));
  });

  test("core-stack skills without project use are Core", () => {
    assert.equal(matcher.evidenceFor("Spring Boot")?.status, "core");
    assert.equal(matcher.evidenceFor("Java")?.status, "core");
  });

  test("text with no skills is reported, not scored", () => {
    const empty = matcher.match("We value kindness and curiosity.");
    assert.equal(empty.rows.length, 0);
    assert.equal(empty.score, 0);
  });
});

describe("job description detection", () => {
  test("a posting is recognised and a question is not", () => {
    assert.equal(looksLikeJobDescription(JD), true);
    assert.equal(looksLikeJobDescription("Does he have experience with Python?"), false);
  });
});
