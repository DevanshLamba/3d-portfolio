import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createAssistantCore } from "../../src/assistant/core.ts";
import { tokenize } from "../../src/assistant/text.ts";

const core = createAssistantCore();

describe("retrieval: known questions return the right fact", () => {
  const cases: [question: string, expectedTopChunk: string][] = [
    ["Where did he study?", "education:bvcoe"],
    ["What is his CGPA?", "education:bvcoe"],
    ["What is Siliqo?", "project:siliqo"],
    ["How does Siliqo handle API keys and authentication?", "project:siliqo:highlight:2"],
    ["What is the tri-path routing in Vayris?", "project:vayris:highlight:1"],
    ["What certifications does he have?", "certifications"],
    ["How can I contact him?", "contact"],
    ["What databases has he used?", "skills:data-frontend"],
    ["Is CloudTasks production ready?", "project:cloudtasks:limits"],
    ["What has he built with React Native?", "project:ordo"],
    ["Who is Devansh?", "profile:identity"],
  ];

  for (const [question, expected] of cases) {
    test(question, () => {
      const { hits } = core.search(question, 3);
      assert.equal(hits[0]?.id, expected, `top hits: ${hits.map((h) => h.id).join(", ")}`);
    });
  }

  test("follow-up facts come from the asked-about project", () => {
    const { hits } = core.search("What did he learn from CloudTasks?", 3);
    assert.ok(hits.length > 0);
    for (const hit of hits) assert.equal(hit.sourceId, "project:cloudtasks");
  });
});

describe("retrieval: result shape", () => {
  test("hits are sorted by score and carry source ids and signals", () => {
    const { hits } = core.search("multi-tenant SaaS backend", 5);
    assert.ok(hits.length >= 2);
    for (let i = 1; i < hits.length; i++) assert.ok(hits[i - 1].score >= hits[i].score);
    for (const hit of hits) {
      assert.ok(hit.sourceId);
      assert.ok(hit.signals.cosine >= 0 && hit.signals.cosine <= 1.0001);
      assert.ok(hit.signals.coverage >= 0 && hit.signals.coverage <= 1);
    }
  });

  test("spelling variants tokenise the same way", () => {
    assert.deepEqual(tokenize("Node.js"), tokenize("nodejs"));
    assert.deepEqual(tokenize("Postgres"), tokenize("PostgreSQL"));
    assert.ok(tokenize("multi-tenant").includes(tokenize("multitenant")[0]));
    assert.deepEqual(tokenize("shipping"), tokenize("shipped"));
  });
});

describe("grounded answers", () => {
  test("answers cite the facts they use", () => {
    const result = core.ask("Where did he study?");
    assert.equal(result.grounded, true);
    assert.equal(result.citations[0].chunkId, "education:bvcoe");
    assert.match(result.answer, /Bharati Vidyapeeth/);
    assert.match(result.answer, /\[1\]/);
  });

  test("every [n] in an answer has a matching citation", () => {
    const result = core.ask("Tell me about Vayris");
    const markers = [...result.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    assert.ok(markers.length > 0);
    for (const n of markers) assert.ok(result.citations.some((c) => c.n === n));
  });

  test("off-topic questions get an honest 'not found'", () => {
    const result = core.ask("What's his favourite pizza topping?");
    assert.equal(result.grounded, false);
    assert.equal(result.citations.length, 0);
    assert.match(result.answer, /couldn't find/i);
  });

  test("unknown technologies are named instead of guessed at", () => {
    const result = core.ask("Does he know Kubernetes?");
    assert.equal(result.grounded, false);
    assert.match(result.answer, /“Kubernetes”/);
  });

  test("asking for the phone number never returns it", () => {
    const result = core.ask("What is his phone number?");
    assert.doesNotMatch(result.answer, /7692968555|76929/);
    assert.match(result.answer, /aren't shared/);
  });

  test("small talk is answered without pretending to cite", () => {
    const result = core.ask("hello");
    assert.equal(result.citations.length, 0);
    assert.match(result.answer, /Hi!/);
  });
});
