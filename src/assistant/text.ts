// Text normalisation shared by indexing, querying and the job matcher.
// Queries and documents must go through exactly the same pipeline, so every
// rule here is applied symmetrically.

const STOPWORDS = new Set(
  `a about above after again all also am an and any anything are as at be because been being both but by can
  could did do does doing done each either for from further get gets got had has have having he her here hers
  him his how i if in into is it its just like me more most much my no nor not of off on once only or other
  our out over own please same she should so some such tell than that the their them then there these they
  this those through to too under until up us very was we were what whats when where which while who whom why
  will with would you your yours know show give list let something thing things one`.split(/\s+/)
);

// Spellings that should land on the same term before stemming.
const CANONICAL: Record<string, string> = {
  "node.js": "node",
  nodejs: "node",
  "express.js": "express",
  expressjs: "express",
  "react.js": "react",
  reactjs: "react",
  "next.js": "next",
  nextjs: "next",
  postgres: "postgresql",
  js: "javascript",
  ts: "typescript",
  k8s: "kubernetes",
  golang: "go",
  "c++": "cpp",
  "c#": "csharp",
  llms: "llm",
  genai: "llm",
  apis: "api",
  uni: "university",
};

// Roots that mean the same thing for retrieval purposes, applied after stemming.
const SAME_ROOT: Record<string, string> = {
  agentic: "agent",
  multiagent: "agent",
  databas: "database",
  db: "database",
  dbs: "database",
};

const SUFFIXES: [string, string][] = [
  ["ational", "ate"],
  ["ization", "ize"],
  ["ation", "ate"],
  ["ment", ""],
  ["ness", ""],
  ["ing", ""],
  ["ed", ""],
  ["ly", ""],
  ["er", ""],
];

/** A small, deliberately conservative suffix stripper. */
export function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  let s = word;

  if (s.endsWith("ies") && s.length > 4) s = s.slice(0, -3) + "y";
  else if (s.endsWith("sses")) s = s.slice(0, -2);
  else if (s.endsWith("s") && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);

  for (let pass = 0; pass < 2; pass++) {
    const rule = SUFFIXES.find(([suffix, replacement]) => {
      return s.endsWith(suffix) && s.length - suffix.length + replacement.length >= 3;
    });
    if (!rule) break;
    s = s.slice(0, -rule[0].length) + rule[1];
  }

  if (/([bdgmnpt])\1$/.test(s)) s = s.slice(0, -1);
  if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

function normaliseRaw(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, " ")
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/'s\b/g, "");
}

function expandPiece(piece: string, out: string[], keepStopwords: boolean) {
  const trimmed = piece.replace(/^[.+]+|[.]+$/g, "");
  if (!trimmed) return;

  const canonical = CANONICAL[trimmed];
  if (canonical) {
    out.push(canonical);
    return;
  }

  // Anything still dotted that isn't a number (a domain, "e.g") splits apart.
  if (trimmed.includes(".") && !/^\d+(\.\d+)?$/.test(trimmed)) {
    trimmed.split(".").forEach((p) => expandPiece(p, out, keepStopwords));
    return;
  }

  const word = trimmed === "c++" ? trimmed : trimmed.replace(/\+$/, "");
  if (!word || (word.length < 2 && !/\d/.test(word))) return;
  if (!keepStopwords && STOPWORDS.has(word)) return;

  const stemmed = stem(word);
  out.push(SAME_ROOT[stemmed] ?? stemmed);
}

export interface TokenizeOptions {
  keepStopwords?: boolean;
}

/**
 * Lowercases, canonicalises and stems. A hyphenated or slashed compound
 * ("multi-tenant", "ci/cd") yields both the joined form and its parts, so a
 * query can match either way of writing it.
 */
export function tokenize(text: string, options: TokenizeOptions = {}): string[] {
  const keep = options.keepStopwords ?? false;
  const out: string[] = [];
  for (const raw of normaliseRaw(text).split(/[^a-z0-9+#./-]+/)) {
    if (!raw) continue;
    const parts = raw.split(/[-/]+/).filter(Boolean);
    if (parts.length > 1) {
      expandPiece(parts.join(""), out, keep);
      parts.forEach((p) => expandPiece(p, out, keep));
    } else {
      expandPiece(raw, out, keep);
    }
  }
  return out;
}

export function isStopword(word: string): boolean {
  return STOPWORDS.has(word.toLowerCase());
}

/**
 * Splits prose into sentences. Only punctuation followed by whitespace ends a
 * sentence, so "Node.js", "Apache 2.0" and "8.39/10" stay whole.
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?]+)\s+(?=\S)/g, "$1\u0001")
    .split("\u0001")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) out.push(tokens[i] + " " + tokens[i + 1]);
  return out;
}
