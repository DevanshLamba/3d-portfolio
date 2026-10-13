// "Leave a response" endpoint: a Vercel Function that validates a visitor's
// details and emails them to the site owner through Resend's REST API.
//
// Configuration lives only in environment variables (Vercel project settings,
// or .env.local for `npm run dev`). See .env.example.
//
//   RESEND_API_KEY      Resend API key. Without it, production refuses and
//                       development runs a dry run that logs instead of sending.
//   CONTACT_TO_EMAIL    Where responses are delivered (never sent to the client).
//   CONTACT_FROM_EMAIL  Verified sender, e.g. "Portfolio <hello@your-domain>".
//   ALLOWED_ORIGINS     Optional comma-separated origins allowed to post.
//
// This file has no relative imports on purpose: Vercel compiles it on its
// own, and the browser form imports the same validation rules from it.

export const LIMITS = {
  name: 100,
  email: 254,
  organisation: 120,
  role: 120,
  message: 1500,
  messageMin: 10,
  body: 10_000,
} as const;

/** Submissions faster than this after the form appeared are treated as bots. */
export const MIN_FILL_MS = 2500;

export interface ResponseInput {
  name: string;
  email: string;
  organisation: string;
  role: string;
  message: string;
  consent: boolean;
  /** Honeypot: hidden from people, so anything here came from a bot. */
  website?: string;
  /** Milliseconds between the form appearing and submit. */
  elapsedMs?: number;
}

export type ResponseField = "name" | "email" | "organisation" | "role" | "message" | "consent";
export type FieldErrors = Partial<Record<ResponseField, string>>;

export interface CleanResponse {
  name: string;
  email: string;
  organisation: string;
  role: string;
  message: string;
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** Plain text only: tags and angle brackets go, control characters go, whitespace is tidied. */
export function plainText(value: unknown, multiline = false): string {
  let s = typeof value === "string" ? value : "";
  // Control characters first (tabs and line breaks are handled as whitespace below).
  s = [...s.normalize("NFKC")]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return (code >= 32 && code !== 127) || ch === "\n" || ch === "\r" || ch === "\t";
    })
    .join("");
  s = s.replace(/<[^>]*>/g, " ").replace(/[<>]/g, " ");
  s = multiline
    ? s.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n")
    : s.replace(/\s+/g, " ");
  return s.trim();
}

/** Shared by the browser form (for instant feedback) and the server (authoritative). */
export function validateResponse(input: Partial<ResponseInput>): { ok: true; value: CleanResponse } | { ok: false; errors: FieldErrors } {
  const value: CleanResponse = {
    name: plainText(input.name),
    email: plainText(input.email).toLowerCase(),
    organisation: plainText(input.organisation),
    role: plainText(input.role),
    message: plainText(input.message, true),
  };
  const errors: FieldErrors = {};

  if (!value.name) errors.name = "Please enter your name.";
  else if (value.name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  if (!value.email) errors.email = "Please enter your email so I can reply.";
  else if (value.email.length > LIMITS.email || !EMAIL.test(value.email)) errors.email = "That email address doesn't look right.";

  if (value.organisation.length > LIMITS.organisation) errors.organisation = `Please keep this under ${LIMITS.organisation} characters.`;
  if (value.role.length > LIMITS.role) errors.role = `Please keep this under ${LIMITS.role} characters.`;

  if (!value.message) errors.message = "Please write a short message.";
  else if (value.message.length < LIMITS.messageMin) errors.message = `Please write at least ${LIMITS.messageMin} characters.`;
  else if (value.message.length > LIMITS.message) errors.message = `Please keep the message under ${LIMITS.message} characters.`;

  if (input.consent !== true) errors.consent = "Please agree to be contacted back.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export interface ContactEnv {
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  ALLOWED_ORIGINS?: string;
  /** "production" on Vercel's production deployment. */
  VERCEL_ENV?: string;
  NODE_ENV?: string;
}

export interface ContactDeps {
  fetch: typeof fetch;
  now: () => number;
  log: (message: string) => void;
}

// Best-effort rate limiting. Serverless instances don't share memory, so this
// stops bursts from one client on one instance; for a hard limit add a rate
// limiting rule in Vercel's firewall or Cloudflare.
const WINDOW_MS = 10 * 60 * 1000;
const PER_CLIENT = 5;
const PER_INSTANCE = 60;
const hits = new Map<string, number[]>();
let instanceHits: number[] = [];

export function resetRateLimits() {
  hits.clear();
  instanceHits = [];
}

function rateLimited(client: string, now: number): boolean {
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
  // Cloudflare sits in front of the site, so its header is the real client.
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function emailText(r: CleanResponse): string {
  return [
    "New response from the portfolio site.",
    "",
    `Name:         ${r.name}`,
    `Email:        ${r.email}`,
    `Organisation: ${r.organisation || "-"}`,
    `Role:         ${r.role || "-"}`,
    "",
    "Message:",
    r.message,
    "",
    "They agreed to be contacted back at the email above. Reply to this email to answer them.",
  ].join("\n");
}

/** The request handler, with its environment and side effects passed in so it can be tested. */
export async function handleContact(request: Request, env: ContactEnv, deps: ContactDeps): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const origin = request.headers.get("origin");
  if (allowed.length && (!origin || !allowed.includes(origin))) {
    return json(403, { ok: false, error: "This form only accepts responses from the portfolio site." });
  }

  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return json(415, { ok: false, error: "Please send the form as JSON." });
  }

  const raw = await request.text();
  if (raw.length > LIMITS.body) return json(413, { ok: false, error: "That message is too long." });

  let input: Partial<ResponseInput>;
  try {
    input = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "The form data couldn't be read." });
  }
  if (!input || typeof input !== "object") return json(400, { ok: false, error: "The form data couldn't be read." });

  // Bots: accept quietly so they learn nothing, but send nothing.
  const bot = (typeof input.website === "string" && input.website.trim() !== "") ||
    (typeof input.elapsedMs === "number" && input.elapsedMs < MIN_FILL_MS);
  if (bot) return json(200, { ok: true });

  if (rateLimited(clientId(request), deps.now())) {
    return json(429, { ok: false, error: "Too many responses from your connection. Please try again later." });
  }

  const checked = validateResponse(input);
  if (!checked.ok) return json(400, { ok: false, error: "Please fix the highlighted fields.", fields: checked.errors });

  const production = env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    if (production) {
      deps.log("contact: RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL is not set");
      return json(500, { ok: false, error: "The form isn't set up yet. Please reach out on LinkedIn instead." });
    }
    deps.log(`contact (dry run, nothing sent): ${checked.value.name} <${checked.value.email}>`);
    return json(200, { ok: true, dryRun: true });
  }

  try {
    const res = await deps.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        reply_to: checked.value.email,
        subject: `Portfolio response from ${checked.value.name}${checked.value.organisation ? ` (${checked.value.organisation})` : ""}`,
        text: emailText(checked.value),
      }),
    });
    if (!res.ok) {
      deps.log(`contact: email provider returned HTTP ${res.status}`);
      return json(502, { ok: false, error: "Your response couldn't be delivered right now. Please try again in a little while." });
    }
  } catch {
    deps.log("contact: email provider unreachable");
    return json(502, { ok: false, error: "Your response couldn't be delivered right now. Please try again in a little while." });
  }

  return json(200, { ok: true });
}

// Read through globalThis so the browser bundle, which imports the rules above,
// doesn't need Node's types or a `process` global.
const processEnv = () => (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/** Vercel Function entry point (Web-standard Request/Response). */
export function POST(request: Request): Promise<Response> {
  return handleContact(request, processEnv(), { fetch, now: Date.now, log: (m) => console.error(m) });
}
