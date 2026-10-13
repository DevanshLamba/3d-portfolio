import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHAT_LIMITS, DEFAULT_FALLBACK_MODEL, DEFAULT_MODEL, handleChat, resetChatLimits } from "../../server/chat.ts";
import { createAssistantCore } from "../../src/assistant/core.ts";
import { sourceHash } from "../../scripts/lib/api-sources.ts";
import { phoneLeaks } from "../helpers/phone.ts";

const KEY = "test-gemini-key";
const core = createAssistantCore();

interface Call {
  url: string;
  key: string | null;
  body: { systemInstruction: { parts: { text: string }[] }; contents: { parts: { text: string }[] }[]; generationConfig: Record<string, unknown> };
}

/** A fake Gemini: each call takes the next scripted reply. */
function gemini(replies: ({ status: number; text?: string } | "hang")[]) {
  const calls: Call[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, key: new Headers(init.headers).get("x-goog-api-key"), body: JSON.parse(String(init.body)) });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply === "hang") throw new Error("timeout");
    const body = reply.text !== undefined ? { candidates: [{ content: { parts: [{ text: reply.text }] } }] } : { error: { code: reply.status } };
    return new Response(JSON.stringify(body), { status: reply.status });
  }) as unknown as typeof fetch;
  return { calls, deps: { fetch: fakeFetch, now: () => 1_000_000, log: () => {} } };
}

const ask = (question: unknown, headers: Record<string, string> = {}, ip = "203.0.113.5") =>
  new Request("https://site.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
    body: JSON.stringify({ question }),
  });

beforeEach(() => resetChatLimits());

describe("chat endpoint", () => {
  test("words a grounded answer from the portfolio's own facts", async () => {
    const { calls, deps } = gemini([{ status: 200, text: "Siliqo is an agentic customer-support API platform [1]." }]);
    const res = await handleChat(ask("What is Siliqo?"), { GEMINI_API_KEY: KEY }, deps);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.answer, /\[1\]/);
    assert.equal(body.model, DEFAULT_MODEL);
    // The same retrieval as the browser, so the client can map citations.
    assert.deepEqual(body.contextIds, core.ask("What is Siliqo?").retrieved.slice(0, CHAT_LIMITS.context).map((h) => h.id));

    assert.equal(calls.length, 1);
    assert.equal(calls[0].key, KEY);
    assert.ok(!calls[0].url.includes(KEY), "key goes in a header, never the URL");
    const sent = calls[0].body.contents[0].parts[0].text;
    assert.match(sent, /Question: What is Siliqo\?/);
    assert.match(sent, /\[1\] Project: Siliqo/);
    assert.match(calls[0].body.systemInstruction.parts[0].text, /Use only the numbered facts/);
  });

  test("questions outside the portfolio never reach the model", async () => {
    const { calls, deps } = gemini([{ status: 200, text: "x [1]" }]);
    const res = await handleChat(ask("Write me a poem about cats"), { GEMINI_API_KEY: KEY }, deps);
    assert.equal(res.status, 422);
    assert.equal(calls.length, 0);
  });

  test("without a key it answers 503 and calls nothing", async () => {
    const { calls, deps } = gemini([]);
    assert.equal((await handleChat(ask("What is Siliqo?"), {}, deps)).status, 503);
    assert.equal(calls.length, 0);
  });

  test("a busy model falls back once to the fallback model", async () => {
    const { calls, deps } = gemini([{ status: 503 }, { status: 200, text: "Vayris is open source [1]." }]);
    const body = await (await handleChat(ask("Is Vayris open source?"), { GEMINI_API_KEY: KEY }, deps)).json();
    assert.equal(body.ok, true);
    assert.equal(body.model, DEFAULT_FALLBACK_MODEL);
    assert.deepEqual(calls.map((c) => c.url.split("/models/")[1].split(":")[0]), [DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL]);
  });

  test("a rejected thinking setting is retried without it", async () => {
    const { calls, deps } = gemini([{ status: 400 }, { status: 200, text: "Ordo is not live yet [1]." }]);
    const body = await (await handleChat(ask("Is ORDO live?"), { GEMINI_API_KEY: KEY }, deps)).json();
    assert.equal(body.ok, true);
    assert.ok("thinkingConfig" in calls[0].body.generationConfig);
    assert.ok(!("thinkingConfig" in calls[1].body.generationConfig));
  });

  test("hard failures, timeouts and uncited answers fall back to offline", async () => {
    for (const replies of [[{ status: 403 }], ["hang", "hang"], [{ status: 200, text: "Siliqo is great." }]] as const) {
      resetChatLimits();
      const { deps } = gemini([...replies]);
      const res = await handleChat(ask("What is Siliqo?"), { GEMINI_API_KEY: KEY }, deps);
      assert.equal(res.status, 424);
      assert.ok(!(await res.text()).includes(KEY));
    }
  });

  test("model output is cleaned: unknown citations dropped, phone numbers and emails redacted", async () => {
    const { deps } = gemini([{ status: 200, text: "Reach him at +91 98765 43210 or x@y.test [1] [9]." }]);
    const body = await (await handleChat(ask("How can I contact him?"), { GEMINI_API_KEY: KEY }, deps)).json();
    assert.deepEqual(phoneLeaks(body.answer), []);
    assert.doesNotMatch(body.answer, /x@y\.test|\[9\]/);
  });

  test("input is validated and rate limited", async () => {
    const { deps } = gemini([{ status: 200, text: "ok [1]" }]);
    assert.equal((await handleChat(ask(""), { GEMINI_API_KEY: KEY }, deps)).status, 400);
    assert.equal((await handleChat(ask("x".repeat(CHAT_LIMITS.question + 1)), { GEMINI_API_KEY: KEY }, deps)).status, 400);
    assert.equal((await handleChat(new Request("https://site.test/api/chat"), { GEMINI_API_KEY: KEY }, deps)).status, 405);
    const statuses: number[] = [];
    for (let i = 0; i < 17; i++) statuses.push((await handleChat(ask("What is Siliqo?", {}, "198.51.100.1"), { GEMINI_API_KEY: KEY }, deps)).status);
    assert.equal(statuses.filter((s) => s === 429).length, 2);
    const locked = { GEMINI_API_KEY: KEY, ALLOWED_ORIGINS: "https://devanshlamba.in" };
    assert.equal((await handleChat(ask("What is Siliqo?", { origin: "https://evil.test" }), locked, deps)).status, 403);
  });
});

describe("api/chat.js bundle", () => {
  test("matches its sources (run npm run build:api after changing them)", () => {
    const root = join(import.meta.dirname, "../..");
    const header = readFileSync(join(root, "api/chat.js"), "utf8").match(/source-hash: ([0-9a-f]+)/)?.[1];
    assert.equal(header, sourceHash(root));
  });

  test("has no imports and contains no secrets", () => {
    const code = readFileSync(join(import.meta.dirname, "../../api/chat.js"), "utf8");
    assert.doesNotMatch(code, /^\s*import\s/m);
    assert.doesNotMatch(code, /AQ\.[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|re_[A-Za-z0-9]{20,}/);
  });
});
