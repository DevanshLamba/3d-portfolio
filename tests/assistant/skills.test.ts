import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { profile } from "../../src/data/profile.ts";
import { createAssistantCore } from "../../src/assistant/core.ts";
import { createOpenAICompatibleProvider, ProviderError, sanitizeCitations } from "../../src/assistant/llm.ts";
import { AUDIENCES, buildPitch } from "../../src/assistant/skills/pitch.ts";
import { buildTourStops, createTour } from "../../src/assistant/skills/tour.ts";
import { TOOLS, toolSchemas } from "../../src/assistant/tools.ts";
import { phoneLeaks } from "../helpers/phone.ts";

const core = createAssistantCore();

describe("tools", () => {
  test("every tool exposes a function-calling schema", () => {
    const schemas = toolSchemas();
    assert.equal(schemas.length, TOOLS.length);
    for (const s of schemas) {
      assert.equal(s.type, "function");
      assert.equal(s.function.parameters.type, "object");
    }
  });

  test("arguments are validated", () => {
    assert.throws(() => core.runTool("get_project", {}), /Missing required argument "name"/);
    assert.throws(() => core.runTool("search_portfolio", { query: "x", top_k: 99 }), /out of range/);
    assert.throws(() => core.runTool("nope"), /Unknown tool/);
  });

  test("list_projects filters by technology", () => {
    const out = core.runTool("list_projects", { technology: "Docker" }) as { projects: { title: string }[] };
    assert.deepEqual(out.projects.map((p) => p.title), ["LeadLoop", "CloudTasks"]);
  });

  test("get_project never exposes demo credentials", () => {
    const out = JSON.stringify(core.runTool("get_project", { name: "CloudTasks" }));
    assert.ok(!out.includes("password"));
  });

  test("get_contact never exposes the phone number", () => {
    const out = JSON.stringify(core.runTool("get_contact"));
    assert.ok(!out.includes("tel:"));
    assert.ok(!out.includes(profile.contact.email.display));
  });
});

describe("agent loop", () => {
  test("splits a compound goal, calls one tool per part and reports every step", () => {
    const seen: string[] = [];
    const run = core.runAgent("Which projects use Python and how can I contact him?", (s) => seen.push(s.kind));
    const tools = run.steps.filter((s) => s.kind === "act").map((s) => s.tool);
    assert.deepEqual(tools, ["list_projects", "get_contact"]);
    assert.deepEqual(seen, ["plan", "act", "observe", "act", "observe", "answer"]);
    assert.match(run.answer, /Siliqo/);
    assert.match(run.answer, /linkedin\.com/);
  });
});

describe("pitch", () => {
  for (const audience of AUDIENCES) {
    test(`${audience} pitch is short, grounded and has working actions`, () => {
      const pitch = buildPitch(profile, audience);
      const words = pitch.text.split(/\s+/).length;
      assert.ok(words > 8 && words < 120, `${words} words`);
      assert.deepEqual(phoneLeaks(pitch.text), []);
      for (const action of pitch.actions) assert.ok(action.href || action.anchor || action.skill, action.label);
    });
  }
});

describe("tour", () => {
  test("stops come from the profile config with narration", () => {
    const stops = buildTourStops(profile);
    assert.equal(stops.length, profile.assistant.tour.length);
    for (const s of stops) assert.ok(s.narration.length > 10, s.id);
  });

  test("controller emits start, stop and end in order and skips unavailable stops", () => {
    const tour = createTour(buildTourStops(profile), { isAvailable: (s) => s.targetId !== "whatido" });
    const log: string[] = [];
    tour.on("start", () => log.push("start"));
    tour.on("stop", (d) => log.push(`stop:${d.stop?.id}`));
    tour.on("end", () => log.push("end"));

    tour.start();
    tour.next();
    tour.next();
    tour.prev();
    tour.end();
    assert.deepEqual(log, ["start", "stop:intro", "stop:about", "stop:career", "stop:about", "end"]);
    assert.equal(tour.active, false);
  });
});

describe("LLM provider", () => {
  test("citations to facts that weren't provided are dropped", () => {
    assert.equal(sanitizeCitations("Built Siliqo [1] and Vayris [7].", 2), "Built Siliqo [1] and Vayris .");
  });

  test("sends an OpenAI-compatible request and returns the answer", async () => {
    let seen: { url: string; auth: string | null; body: { model: string; messages: unknown[] } } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get("Authorization"), body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Siliqo is an API [1]." } }] }), { status: 200 });
    }) as unknown as typeof fetch;

    const provider = createOpenAICompatibleProvider({ apiKey: "sk-test", baseUrl: "https://llm.example.test/v1/", model: "m", fetchImpl: fakeFetch });
    const answer = await provider.generate({ question: "q", context: [{ n: 1, title: "t", text: "x" }], subjectName: "D" });
    assert.equal(answer, "Siliqo is an API [1].");
    assert.equal(seen!.url, "https://llm.example.test/v1/chat/completions");
    assert.equal(seen!.auth, "Bearer sk-test");
    assert.equal(seen!.body.model, "m");
    assert.ok(!JSON.stringify(provider).includes("sk-test"), "key must not be readable from the provider object");
  });

  test("HTTP errors surface as ProviderError without echoing the key", async () => {
    const fakeFetch = (async () => new Response("bad key sk-test", { status: 401 })) as unknown as typeof fetch;
    const provider = createOpenAICompatibleProvider({ apiKey: "sk-test", baseUrl: "https://llm.example.test/v1", model: "m", fetchImpl: fakeFetch });
    await assert.rejects(
      provider.generate({ question: "q", context: [], subjectName: "D" }),
      (err: unknown) => err instanceof ProviderError && err.status === 401 && !err.message.includes("sk-test")
    );
  });
});
