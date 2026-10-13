// Scaled dot-product self-attention, softmax(QKᵀ/√d)·V, over a typed
// sentence. There's no trained model in the browser, so the heads are built to
// show the mechanism honestly:
//   Content   Q = K = token embedding: tokens attend to identical/similar tokens
//   Position  Q = K = positional encoding: tokens attend to their neighbours
//   Mixed     embedding + position through seeded random projections, the
//             shape of an untrained head in a real transformer

import { gaussian, seeded } from "./random.ts";

export const MAX_TOKENS = 14;

export interface AttentionHead {
  name: string;
  description: string;
  /** weights[i][j]: how much token i attends to token j. Each row sums to 1. */
  weights: number[][];
}

export interface AttentionResult {
  tokens: string[];
  dModel: number;
  heads: AttentionHead[];
}

export function attentionTokens(sentence: string): string[] {
  return (sentence.toLowerCase().match(/[a-z0-9']+/g) ?? []).slice(0, MAX_TOKENS);
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A deterministic pseudo-embedding with norm √d, seeded by the token text. */
function embed(token: string, d: number): number[] {
  const rand = seeded(hash(token));
  const v = Array.from({ length: d }, () => gaussian(rand));
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => (x / norm) * Math.sqrt(d));
}

/** Sinusoidal positional encoding, scaled to norm √d. */
function position(pos: number, d: number): number[] {
  const v = Array.from({ length: d }, (_, i) => {
    const angle = pos / 10000 ** ((2 * Math.floor(i / 2)) / d);
    return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => (x / norm) * Math.sqrt(d));
}

function project(x: number[], w: number[][]): number[] {
  return w.map((row) => row.reduce((s, wij, j) => s + wij * x[j], 0));
}

export function softmax(row: number[]): number[] {
  const max = Math.max(...row);
  const exps = row.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function attentionWeights(q: number[][], k: number[][]): number[][] {
  const d = q[0]?.length ?? 1;
  return q.map((qi) => softmax(k.map((kj) => qi.reduce((s, v, t) => s + v * kj[t], 0) / Math.sqrt(d))));
}

export function selfAttention(sentence: string, dModel = 16, seed = 11): AttentionResult {
  const tokens = attentionTokens(sentence);
  if (!tokens.length) return { tokens, dModel, heads: [] };

  const emb = tokens.map((t) => embed(t, dModel));
  const pos = tokens.map((_, i) => position(i, dModel));
  const mixed = emb.map((e, i) => e.map((v, j) => v + pos[i][j]));

  const rand = seeded(seed);
  const matrix = () => Array.from({ length: dModel }, () => Array.from({ length: dModel }, () => gaussian(rand) / Math.sqrt(dModel)));
  const wq = matrix();
  const wk = matrix();

  return {
    tokens,
    dModel,
    heads: [
      { name: "Content", description: "Q = K = token embedding: repeated or identical words light up.", weights: attentionWeights(emb, emb) },
      { name: "Position", description: "Q = K = positional encoding: each token looks at its neighbours.", weights: attentionWeights(pos, pos) },
      {
        name: "Mixed",
        description: "Embedding + position through random projections: what an untrained head looks like.",
        weights: attentionWeights(
          mixed.map((x) => project(x, wq)),
          mixed.map((x) => project(x, wk))
        ),
      },
    ],
  };
}
