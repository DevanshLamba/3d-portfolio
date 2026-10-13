import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { handleContact, LIMITS, plainText, resetRateLimits, validateResponse, type ContactEnv } from "../../api/contact.ts";

const ENV: ContactEnv = {
  RESEND_API_KEY: "re_test_key",
  CONTACT_TO_EMAIL: "owner@example.test",
  CONTACT_FROM_EMAIL: "Portfolio <form@example.test>",
  VERCEL_ENV: "production",
};

const GOOD = {
  name: "Asha Rao",
  email: "Asha@Example.org",
  organisation: "Acme",
  role: "Backend intern",
  message: "Hi Devansh, we'd love to talk about a backend role.",
  consent: true,
  website: "",
  elapsedMs: 9000,
};

interface Sent {
  url: string;
  auth: string | null;
  body: { from: string; to: string[]; reply_to: string; subject: string; text: string; html?: string };
}

function setup(providerStatus = 200) {
  const sent: Sent[] = [];
  const logs: string[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    sent.push({ url, auth: new Headers(init.headers).get("Authorization"), body: JSON.parse(String(init.body)) });
    return new Response("{}", { status: providerStatus });
  }) as unknown as typeof fetch;
  return { sent, logs, deps: { fetch: fakeFetch, now: () => 1_000_000, log: (m: string) => logs.push(m) } };
}

const post = (body: unknown, headers: Record<string, string> = {}, ip = "203.0.113.7") =>
  new Request("https://site.test/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => resetRateLimits());

describe("contact endpoint: delivery", () => {
  test("a valid response is emailed as plain text with reply-to set to the visitor", async () => {
    const { sent, deps } = setup();
    const res = await handleContact(post(GOOD), ENV, deps);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, "https://api.resend.com/emails");
    assert.equal(sent[0].auth, "Bearer re_test_key");
    assert.deepEqual(sent[0].body.to, ["owner@example.test"]);
    assert.equal(sent[0].body.reply_to, "asha@example.org");
    assert.equal(sent[0].body.html, undefined);
    assert.match(sent[0].body.text, /Organisation: Acme/);
    assert.match(sent[0].body.subject, /Asha Rao \(Acme\)/);
  });

  test("the receiving address and API key never appear in a response", async () => {
    for (const [body, status] of [[GOOD, 200], [{ ...GOOD, email: "nope" }, 400]] as const) {
      resetRateLimits();
      const { deps } = setup();
      const res = await handleContact(post(body), ENV, deps);
      assert.equal(res.status, status);
      const text = await res.text();
      assert.ok(!text.includes("owner@example.test") && !text.includes("re_test_key"));
    }
  });

  test("provider failures report a retryable error", async () => {
    const { deps } = setup(500);
    const res = await handleContact(post(GOOD), ENV, deps);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).ok, false);
  });

  test("production without configuration refuses; local runs are a dry run", async () => {
    const prod = setup();
    const res = await handleContact(post(GOOD), { VERCEL_ENV: "production" }, prod.deps);
    assert.equal(res.status, 500);
    assert.equal(prod.sent.length, 0);

    resetRateLimits();
    const local = setup();
    const dry = await handleContact(post(GOOD), {}, local.deps);
    assert.equal(dry.status, 200);
    assert.equal((await dry.json()).dryRun, true);
    assert.equal(local.sent.length, 0);
  });
});

describe("contact endpoint: validation and abuse protection", () => {
  test("required fields, email format, consent and length caps are enforced", async () => {
    const { sent, deps } = setup();
    const res = await handleContact(post({ ...GOOD, name: " ", email: "not-an-email", message: "hi", consent: false }), ENV, deps);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.deepEqual(Object.keys(body.fields).sort(), ["consent", "email", "message", "name"]);
    assert.equal(sent.length, 0);

    resetRateLimits();
    const long = await handleContact(post({ ...GOOD, message: "x".repeat(LIMITS.message + 1) }), ENV, deps);
    assert.equal(long.status, 400);
    const huge = await handleContact(post({ ...GOOD, message: "x".repeat(LIMITS.body) }), ENV, deps);
    assert.equal(huge.status, 413);
  });

  test("HTML is stripped and line breaks can't reach the subject", async () => {
    const { sent, deps } = setup();
    await handleContact(post({ ...GOOD, name: "Asha\r\nBcc: x@evil.test", message: "<script>alert(1)</script>Hello <b>there</b>, real message." }), ENV, deps);
    assert.equal(sent.length, 1);
    assert.ok(!/[<>]/.test(sent[0].body.text));
    assert.ok(!/[\r\n]/.test(sent[0].body.subject));
    assert.match(sent[0].body.text, /Hello there , real message\.|Hello there, real message\./);
  });

  test("the honeypot and too-fast submissions are accepted quietly but not sent", async () => {
    const { sent, deps } = setup();
    const bot = await handleContact(post({ ...GOOD, website: "https://spam.example" }), ENV, deps);
    assert.equal(bot.status, 200);
    const fast = await handleContact(post({ ...GOOD, elapsedMs: 300 }), ENV, deps);
    assert.equal(fast.status, 200);
    assert.equal(sent.length, 0);
  });

  test("bursts from one client are rate limited", async () => {
    const { deps } = setup();
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await handleContact(post(GOOD), ENV, deps)).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429]);
    assert.equal((await handleContact(post(GOOD, {}, "198.51.100.9"), ENV, deps)).status, 200);
  });

  test("method, content type, JSON and origin are checked", async () => {
    const { deps } = setup();
    assert.equal((await handleContact(new Request("https://site.test/api/contact"), ENV, deps)).status, 405);
    assert.equal((await handleContact(post(GOOD, { "content-type": "text/plain" }), ENV, deps)).status, 415);
    assert.equal((await handleContact(post("{not json"), ENV, deps)).status, 400);
    const locked = { ...ENV, ALLOWED_ORIGINS: "https://devanshlamba.in" };
    assert.equal((await handleContact(post(GOOD, { origin: "https://evil.test" }), locked, deps)).status, 403);
    assert.equal((await handleContact(post(GOOD, { origin: "https://devanshlamba.in" }), locked, deps)).status, 200);
  });
});

describe("shared rules", () => {
  test("plainText drops tags and control characters", () => {
    assert.equal(plainText("<i>Hi</i>\u0007 there"), "Hi there");
    assert.equal(plainText("line one\r\n\r\n\r\nline two", true), "line one\n\nline two");
  });

  test("optional fields may be empty", () => {
    const r = validateResponse({ ...GOOD, organisation: "", role: "" });
    assert.equal(r.ok, true);
  });
});
