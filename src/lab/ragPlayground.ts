// RAG playground: chunk any pasted text with a chosen size and overlap, index
// it with the same TF-IDF + rerank engine the assistant uses, and query it.

import { TfIdfIndex, isRelevant, type SearchResult } from "../assistant/retrieval.ts";
import { splitSentences } from "../assistant/text.ts";
import type { Chunk } from "../assistant/types.ts";

export interface PlaygroundChunk {
  index: number;
  text: string;
  /** Characters carried over from the previous chunk. */
  overlapChars: number;
}

/**
 * Greedy sentence packing: sentences are added until the next one would
 * exceed `size` characters, then a new chunk starts with the last `overlap`
 * characters (on a word boundary) of the previous one. A single sentence
 * longer than `size` becomes its own chunk rather than being cut mid-word.
 */
export function chunkText(text: string, size: number, overlap: number): PlaygroundChunk[] {
  const sentences = splitSentences(text.replace(/\s+/g, " ").trim());
  const chunks: PlaygroundChunk[] = [];
  let current = "";
  let carried = 0;

  const flush = () => {
    if (!current.trim()) return;
    chunks.push({ index: chunks.length, text: current.trim(), overlapChars: carried });
    const tail = overlap > 0 ? current.slice(-overlap) : "";
    const cut = tail.indexOf(" ");
    current = overlap > 0 && cut >= 0 ? tail.slice(cut + 1) : "";
    carried = current.length;
  };

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > size && current.length > carried) {
      flush();
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      current = candidate;
    }
  }
  flush();
  return chunks;
}

export function buildPlaygroundIndex(chunks: PlaygroundChunk[]): TfIdfIndex {
  const docs: Chunk[] = chunks.map((c) => ({
    id: `chunk:${c.index}`,
    sourceId: `chunk:${c.index}`,
    section: "about",
    title: `Chunk ${c.index + 1}`,
    text: c.text,
    tags: [],
  }));
  return new TfIdfIndex(docs);
}

export interface PlaygroundQuery {
  result: SearchResult;
  relevant: boolean;
}

export function queryPlayground(index: TfIdfIndex, query: string, topK = 4): PlaygroundQuery {
  const result = index.search(query, { topK });
  return { result, relevant: isRelevant(result) };
}

export const SAMPLE_TEXT =
  "Retrieval-augmented generation answers questions from a document collection instead of from a model's memory. " +
  "First the documents are split into chunks. Chunk size is a trade-off: small chunks are precise but lose context, large chunks keep context but dilute the match. " +
  "Overlap repeats the end of one chunk at the start of the next, so a fact that straddles a boundary can still be found. " +
  "Each chunk is turned into a vector. Here that is TF-IDF: terms that are frequent in a chunk but rare across the collection get high weight. " +
  "A question is vectorised the same way and compared with every chunk by cosine similarity. " +
  "The best candidates are then reranked on exact-term coverage, phrase matches and title hits. " +
  "Finally the top chunks are handed to the answer step, which must cite them and say so when nothing relevant was found.";
