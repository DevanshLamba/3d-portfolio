// Offline, grounded answer composition. Every sentence in an answer is lifted
// from a retrieved fact and carries that fact's [n] citation; when nothing
// relevant was retrieved the answer says so instead of guessing.

import { isRelevant, type SearchResult } from "./retrieval.ts";
import { splitSentences, tokenize } from "./text.ts";
import type { AnswerOutcome, Citation, RetrievedChunk } from "./types.ts";

export interface ComposeContext {
  firstName: string;
  /** Topics to suggest when a question can't be answered. */
  suggestions: string[];
}

export interface ComposedAnswer {
  answer: string;
  citations: Citation[];
  grounded: boolean;
  outcome: AnswerOutcome;
}

const MAX_PIECES = 3;
const KEEP_RATIO = 0.6;

const SMALL_TALK: [RegExp, (ctx: ComposeContext) => string][] = [
  [
    /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening))\b[\s!.?]*$/i,
    (ctx) => `Hi! I answer questions about ${ctx.firstName}'s work using only what's on this site. Try asking about ${listOf(ctx.suggestions)}.`,
  ],
  [/^(thanks|thank you|thx|cheers)\b[\s!.?]*$/i, () => "You're welcome."],
  [
    /^(help|what can you do\??|how does this work\??)$/i,
    (ctx) =>
      `Ask me anything about ${ctx.firstName}'s projects, skills, education or contact details and I'll answer from the site's content with citations. You can also paste a job description to see how his experience matches it.`,
  ],
];

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter++;
  });
  return inter / (a.size + b.size - inter || 1);
}

/** Words from the query worth naming in "I couldn't find X". */
function namedUnknowns(query: string, unknownTerms: string[]): string[] {
  if (!unknownTerms.length) return [];
  const unknown = new Set(unknownTerms);
  const words = query.split(/\s+/);
  return words
    .map((w, i) => ({ w: w.replace(/^[^\w]+|[^\w+#.]+$/g, "").replace(/'s$/i, ""), i }))
    .filter(({ w }) => w.length > 1)
    .filter(({ w }) => {
      const tokens = tokenize(w);
      return tokens.length > 0 && tokens.every((t) => unknown.has(t));
    })
    .filter(({ w, i }) => (i > 0 && /^[A-Z]/.test(w)) || /[.+#\d]/.test(w))
    .map(({ w }) => w);
}

/** The topic sentence plus the one that best matches the question. */
function pickSentences(hit: RetrievedChunk, queryTerms: Set<string>): string {
  const sentences = splitSentences(hit.text);
  if (sentences.length <= 2) return sentences.join(" ");
  const [first, ...rest] = sentences;
  const best = rest
    .map((s, i) => ({ s, i, hits: tokenize(s).filter((t) => queryTerms.has(t)).length }))
    .sort((a, b) => b.hits - a.hits || a.i - b.i)[0];
  return `${first} ${best.s}`;
}

export function smallTalk(query: string, ctx: ComposeContext): string | null {
  const q = query.trim();
  for (const [pattern, reply] of SMALL_TALK) if (pattern.test(q)) return reply(ctx);
  return null;
}

export function notFound(query: string, result: SearchResult, ctx: ComposeContext): string {
  const named = namedUnknowns(query, result.unknownTerms);
  const lead = named.length
    ? `I couldn't find anything about ${named.map((w) => `“${w}”`).join(" or ")} in ${ctx.firstName}'s portfolio, so I won't guess.`
    : `I couldn't find that in ${ctx.firstName}'s portfolio, so I won't guess.`;
  return `${lead} Try asking about ${listOf(ctx.suggestions)}.`;
}

export function composeAnswer(query: string, result: SearchResult, ctx: ComposeContext): ComposedAnswer {
  const chat = smallTalk(query, ctx);
  if (chat) return { answer: chat, citations: [], grounded: false, outcome: "chat" };

  if (!isRelevant(result)) {
    return { answer: notFound(query, result, ctx), citations: [], grounded: false, outcome: "not-found" };
  }

  const top = result.hits[0].score;
  const queryTerms = new Set(result.queryTerms);
  const chosen: { hit: RetrievedChunk; text: string; terms: Set<string> }[] = [];

  for (const hit of result.hits) {
    if (chosen.length >= MAX_PIECES || hit.score < top * KEEP_RATIO) break;
    const text = pickSentences(hit, queryTerms);
    const terms = new Set(tokenize(text));
    // The career entry and the project overview often say the same thing.
    if (chosen.some((c) => jaccard(c.terms, terms) > 0.55)) continue;
    chosen.push({ hit, text, terms });
  }

  const citations: Citation[] = chosen.map(({ hit }, i) => ({
    n: i + 1,
    chunkId: hit.id,
    sourceId: hit.sourceId,
    title: hit.title,
    section: hit.section,
    anchor: hit.anchor,
  }));

  const pieces = chosen.map(({ hit, text }, i) => {
    const body = hit.section === "about" ? `In his words: “${text}”` : text;
    return `${body} [${i + 1}]`;
  });

  const named = namedUnknowns(query, result.unknownTerms);
  if (named.length) {
    pieces.push(`I didn't find anything on ${named.map((w) => `“${w}”`).join(" or ")} specifically.`);
  }

  return { answer: pieces.join("\n\n"), citations, grounded: true, outcome: "answered" };
}
