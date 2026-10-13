// Server-side answer wording with Gemini. The browser sends only a question;
// retrieval runs here with the same engine as the assistant, and Gemini sees
// nothing but the top portfolio facts. That keeps the key on the server and
// stops the endpoint being used as a general-purpose chatbot.
//
// Bundled into api/chat.js by `npm run build:api` (Vercel runs that file).
//
//   GEMINI_API_KEY   Google AI Studio key. Without it the endpoint answers 503
//                    and the site uses its offline answers.
//   GEMINI_MODEL     Optional, default gemini-flash-latest (always the current Flash).
//   GEMINI_FALLBACK_MODEL  Optional, tried once when the main model is busy;
//                    default gemini-3.1-flash-lite.
//   ALLOWED_ORIGINS  Optional comma-separated origins allowed to call it.

import { profile } from "../src/data/profile.ts";
import { createAssistantCore } from "../src/assistant/core.ts";
import { redactSensitive } from "../src/assistant/knowledge.ts";
import { buildMessages, sanitizeCitations } from "../src/assistant/llm.ts";

export const CHAT_LIMITS = { question: 400, body: 2000, context: 4 } as const;
export const DEFAULT_MODEL = "gemini-flash-latest";
export const DEFAULT_FALLBACK_MODEL = "gemini-3.1-flash-lite";
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

export interface ChatEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_FALLBACK_MODEL?: string;
  ALLOWED_ORIGINS?: string;
}

export interface ChatDeps {
  fetch: typeof fetch;
  now: () => number;
  log: (message: string) => void;
}

const core = createAssistantCore(profile);

// Best-effort, per instance (serverless instances don't share memory).
const WINDOW_MS = 10 * 60 * 1000;
const PER_CLIENT = 15;
const PER_INSTANCE = 300;
const hits = new Map<string, number[]>();
let instanceHits: number[] = [];

export function resetChatLimits() {
  hits.clear();
  instanceHits = [];
}

function limited(client: string, now: number): boolean {
  const recent = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  instanceHits = instanceHits.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_CLIENT || instanceHits.length >= PER_INSTANCE) {
    hits.set(client, recent);
    return true;
  }
  recent.push(now);
  instanceHits.push(now);
  hits.set(client, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

function clientId(request: Request): string {
  const h = request.headers;
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function handleChat(request: Request, env: ChatEnv, deps: ChatDeps): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });

  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const origin = request.headers.get("origin");
  if (allowed.length && (!origin || !allowed.includes(origin))) return json(403, { ok: false, error: "Not allowed." });
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json(415, { ok: false, error: "Send JSON." });

  const raw = await request.text();
  if (raw.length > CHAT_LIMITS.body) return json(413, { ok: false, error: "Question too long." });
  let body: { question?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "Couldn't read the request." });
  }
  const question = typeof body?.question === "string" ? body.question.replace(/\s+/g, " ").trim() : "";
  if (!question || question.length > CHAT_LIMITS.question) return json(400, { ok: false, error: "Ask a question of up to 400 characters." });

  if (!env.GEMINI_API_KEY) return json(503, { ok: false, error: "Live answers aren't set up." });
  if (limited(clientId(request), deps.now())) return json(429, { ok: false, error: "Too many questions. Try again in a few minutes." });

  // Only portfolio questions with relevant facts reach the model.
  const offline = core.ask(question);
  if (offline.outcome !== "answered") return json(422, { ok: false, error: "Nothing relevant to word." });
  const hitsUsed = offline.retrieved.slice(0, CHAT_LIMITS.context);
  const context = hitsUsed.map((h, i) => ({ n: i + 1, title: h.title, text: h.text }));
  const [system, user] = buildMessages({ question, context, subjectName: profile.name });

  const key = env.GEMINI_API_KEY;
  const call = async (model: string, thinkingOff: boolean): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      return await deps.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system.content }] },
          contents: [{ role: "user", parts: [{ text: user.content }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
            // Flash models think by default; these short, grounded answers don't need it.
            ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const models = [env.GEMINI_MODEL || DEFAULT_MODEL, env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL].map((m) => m.trim());
  for (const model of [...new Set(models)]) {
    try {
      let res = await call(model, /flash/.test(model));
      // Some models reject the thinking setting; ask again without it.
      if (res.status === 400 && /flash/.test(model)) res = await call(model, false);
      if (!res.ok) {
        deps.log(`chat: Gemini ${model} returned HTTP ${res.status}`);
        if (TRANSIENT.has(res.status)) continue;
        break;
      }
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      const answer = redactSensitive(sanitizeCitations(text, context.length));
      if (!answer || !/\[\d+\]/.test(answer)) return json(502, { ok: false, error: "The live answer had no sources." });
      return json(200, { ok: true, answer, model, contextIds: hitsUsed.map((h) => h.id) });
    } catch {
      deps.log(`chat: Gemini ${model} unreachable or timed out`);
    }
  }
  return json(502, { ok: false, error: "The live model is unavailable." });
}

const processEnv = () => (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/** Vercel Function entry point. */
export function POST(request: Request): Promise<Response> {
  return handleChat(request, processEnv(), { fetch, now: Date.now, log: (m) => console.error(m) });
}
