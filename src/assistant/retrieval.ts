// In-browser retrieval: TF-IDF vectors, cosine similarity for recall, then a
// cheap rerank that rewards exact-term coverage, tag hits, phrase adjacency
// and title hits. No network, no model download.

import { bigrams, tokenize } from "./text.ts";
import type { Chunk, RetrievedChunk } from "./types.ts";

// Query words that imply a topic the corpus tags rather than spells out:
// "where did he study" should reach the education fact even though it never
// says "study". Expansion terms help recall but never count as coverage.
const RAW_EXPANSIONS: [string[], string][] = [
  [["study", "studied", "studying", "college", "university", "school", "degree", "graduate", "graduation", "cgpa", "gpa", "qualification"], "education"],
  [["reach", "contact", "email", "mail", "hire", "touch", "phone", "call", "message", "dm"], "contact"],
  [["stack", "tech", "technologies", "tools", "languages", "know", "knows", "proficient", "familiar", "skilled"], "skills"],
  [["job", "jobs", "worked", "experience", "career", "history", "timeline", "journey"], "experience"],
  [["built", "build", "made", "created", "shipped", "portfolio", "projects"], "project"],
  [["certificate", "certificates", "certified", "courses", "course"], "certifications"],
  [["now", "currently", "current", "lately", "today"], "current"],
  [["who", "yourself", "introduce", "introduction"], "intro"],
  [["proud", "accomplish", "accomplishments", "awards", "achievement"], "achievements"],
  [["offer", "services", "freelance", "consult", "consulting"], "services"],
  [["where", "hometown", "born", "grew", "from", "city", "based", "lives", "relocate", "remote"], "location"],
];

const EXPANSION_WEIGHT = 0.5;

function buildExpansionMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [triggers, topic] of RAW_EXPANSIONS) {
    const targets = tokenize(topic, { keepStopwords: true });
    for (const trigger of triggers) {
      for (const t of tokenize(trigger, { keepStopwords: true })) {
        map.set(t, [...(map.get(t) ?? []), ...targets]);
      }
    }
  }
  return map;
}

const EXPANSIONS = buildExpansionMap();

interface IndexedDoc {
  chunk: Chunk;
  vector: Map<string, number>;
  terms: Set<string>;
  tagTerms: Set<string>;
  titleTerms: Set<string>;
  phrases: Set<string>;
}

export interface SearchOptions {
  topK?: number;
  /** How many cosine candidates go into the rerank. */
  candidates?: number;
}

export interface SearchResult {
  hits: RetrievedChunk[];
  /** Stemmed content terms from the query (subject and stop words removed). */
  queryTerms: string[];
  /** Content terms that appear nowhere in the corpus. */
  unknownTerms: string[];
}

export const RERANK_WEIGHTS = {
  cosine: 0.45,
  coverage: 0.25,
  tagMatch: 0.12,
  phrase: 0.1,
  titleMatch: 0.08,
};

/** Below this a hit is noise, not an answer. */
export const MIN_RELEVANCE = 0.16;

function l2normalise(vec: Map<string, number>): Map<string, number> {
  let norm = 0;
  vec.forEach((w) => (norm += w * w));
  norm = Math.sqrt(norm) || 1;
  vec.forEach((w, t) => vec.set(t, w / norm));
  return vec;
}

export class TfIdfIndex {
  readonly docs: IndexedDoc[] = [];
  readonly idf = new Map<string, number>();
  private readonly subjectTerms: Set<string>;

  /**
   * @param subject Words that name the portfolio owner. They appear in so many
   * facts that they carry no signal, and a question that only matches the name
   * ("what's Devansh's favourite film?") must not count as answered.
   */
  constructor(chunks: Chunk[], subject: string[] = []) {
    this.subjectTerms = new Set(subject.flatMap((s) => tokenize(s, { keepStopwords: true })));

    const tokenised = chunks.map((chunk) => {
      const title = this.strip(tokenize(chunk.title));
      const text = this.strip(tokenize(chunk.text));
      const tags = this.strip(chunk.tags.flatMap((t) => tokenize(t)));
      return { chunk, title, text, tags };
    });

    const df = new Map<string, number>();
    for (const doc of tokenised) {
      new Set([...doc.title, ...doc.text, ...doc.tags]).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
    }
    const n = chunks.length;
    df.forEach((count, term) => this.idf.set(term, Math.log(1 + n / count)));

    for (const doc of tokenised) {
      const tf = new Map<string, number>();
      const bump = (terms: string[], by: number) =>
        terms.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + by));
      bump(doc.title, 2);
      bump(doc.text, 1);
      bump(doc.tags, 1);

      const vector = new Map<string, number>();
      tf.forEach((count, term) => vector.set(term, (1 + Math.log(count)) * (this.idf.get(term) ?? 0)));

      this.docs.push({
        chunk: doc.chunk,
        vector: l2normalise(vector),
        terms: new Set([...doc.title, ...doc.text, ...doc.tags]),
        tagTerms: new Set(doc.tags),
        titleTerms: new Set(doc.title),
        phrases: new Set([...bigrams(doc.title), ...bigrams(doc.text)]),
      });
    }
  }

  get size(): number {
    return this.docs.length;
  }

  private strip(terms: string[]): string[] {
    return terms.filter((t) => !this.subjectTerms.has(t));
  }

  /** Splits a query into content terms and topic expansions. */
  analyseQuery(query: string): { content: string[]; expansions: string[] } {
    const all = tokenize(query, { keepStopwords: true });
    const content = this.strip(tokenize(query));
    const expansions = new Set<string>();
    for (const t of all) EXPANSIONS.get(t)?.forEach((e) => expansions.add(e));

    // "Who is Devansh?" is all stop words and name: treat it as an intro.
    if (content.length === 0 && all.some((t) => this.subjectTerms.has(t))) {
      tokenize("intro").forEach((e) => expansions.add(e));
    }
    content.forEach((t) => expansions.delete(t));
    return { content, expansions: [...expansions] };
  }

  search(query: string, options: SearchOptions = {}): SearchResult {
    const topK = options.topK ?? 5;
    const candidates = Math.max(topK, options.candidates ?? 15);
    const { content, expansions } = this.analyseQuery(query);
    const contentSet = new Set(content);
    const unknownTerms = [...contentSet].filter((t) => !this.idf.has(t));

    const qtf = new Map<string, number>();
    content.forEach((t) => qtf.set(t, (qtf.get(t) ?? 0) + 1));
    expansions.forEach((t) => qtf.set(t, (qtf.get(t) ?? 0) + EXPANSION_WEIGHT));
    const qvec = new Map<string, number>();
    qtf.forEach((count, term) => {
      const idf = this.idf.get(term);
      if (idf) qvec.set(term, (count >= 1 ? 1 + Math.log(count) : count) * idf);
    });
    l2normalise(qvec);

    if (qvec.size === 0) return { hits: [], queryTerms: content, unknownTerms };

    const allQueryTerms = new Set([...content, ...expansions]);
    const queryPhrases = bigrams(content);

    const recalled = this.docs
      .map((doc) => {
        let dot = 0;
        qvec.forEach((w, t) => {
          const d = doc.vector.get(t);
          if (d) dot += w * d;
        });
        return { doc, cosine: dot };
      })
      .filter((r) => r.cosine > 0)
      .sort((a, b) => b.cosine - a.cosine)
      .slice(0, candidates);

    const hits = recalled.map(({ doc, cosine }): RetrievedChunk => {
      const matchedTerms = [...contentSet].filter((t) => doc.terms.has(t));
      const coverage = contentSet.size ? matchedTerms.length / contentSet.size : 0;
      const tagHits = [...allQueryTerms].filter((t) => doc.tagTerms.has(t)).length;
      const tagMatch = Math.min(1, tagHits / Math.min(allQueryTerms.size, 2));
      const phrase = queryPhrases.length
        ? queryPhrases.filter((b) => doc.phrases.has(b)).length / queryPhrases.length
        : 0;
      const titleMatch = contentSet.size
        ? [...contentSet].filter((t) => doc.titleTerms.has(t)).length / contentSet.size
        : 0;

      const signals = { cosine, coverage, tagMatch, phrase, titleMatch };
      const raw =
        RERANK_WEIGHTS.cosine * cosine +
        RERANK_WEIGHTS.coverage * coverage +
        RERANK_WEIGHTS.tagMatch * tagMatch +
        RERANK_WEIGHTS.phrase * phrase +
        RERANK_WEIGHTS.titleMatch * titleMatch;

      const { chunk } = doc;
      return {
        id: chunk.id,
        sourceId: chunk.sourceId,
        section: chunk.section,
        title: chunk.title,
        text: chunk.text,
        anchor: chunk.anchor,
        score: raw * (chunk.weight ?? 1),
        signals,
        matchedTerms,
      };
    });

    hits.sort((a, b) => b.score - a.score);
    return { hits: hits.slice(0, topK), queryTerms: content, unknownTerms };
  }
}

/**
 * Whether a search found something worth answering from. A query whose every
 * content word is unknown to the corpus is unanswered even if expansions
 * pulled in a loosely related fact.
 */
export function isRelevant(result: SearchResult): boolean {
  const top = result.hits[0];
  if (!top || top.score < MIN_RELEVANCE) return false;
  if (result.queryTerms.length === 0) return true;
  const known = result.queryTerms.filter((t) => !result.unknownTerms.includes(t));
  return known.length > 0 && result.hits.some((h) => h.matchedTerms.length > 0);
}
