// Seeded randomness so every demo is reproducible: the same seed gives the
// same dataset, the same initial weights and the same result.

export type Rand = () => number;

/** mulberry32: a tiny, fast 32-bit PRNG returning floats in [0, 1). */
export function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box–Muller. */
export function gaussian(rand: Rand): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export interface Point2 {
  x: number;
  y: number;
}

export interface Labelled extends Point2 {
  label: 0 | 1;
}

/** Two interleaved spirals in roughly [-1, 1]²; the classic hard case for a linear model. */
export function spirals(n: number, noise: number, rand: Rand): Labelled[] {
  const out: Labelled[] = [];
  const perClass = Math.floor(n / 2);
  for (let i = 0; i < perClass; i++) {
    const r = (i / perClass) * 0.95 + 0.05;
    const t = (i / perClass) * 1.75 * 2 * Math.PI;
    for (const label of [0, 1] as const) {
      const angle = t + label * Math.PI;
      out.push({
        x: r * Math.sin(angle) + gaussian(rand) * noise,
        y: r * Math.cos(angle) + gaussian(rand) * noise,
        label,
      });
    }
  }
  return out;
}

export function xor(n: number, noise: number, rand: Rand): Labelled[] {
  return Array.from({ length: n }, () => {
    const x = rand() * 2 - 1;
    const y = rand() * 2 - 1;
    return { x: x + gaussian(rand) * noise, y: y + gaussian(rand) * noise, label: (x * y > 0 ? 0 : 1) as 0 | 1 };
  });
}

export function circles(n: number, noise: number, rand: Rand): Labelled[] {
  return Array.from({ length: n }, (_, i) => {
    const label = (i % 2) as 0 | 1;
    const r = label ? 0.75 : 0.3;
    const a = rand() * 2 * Math.PI;
    return { x: r * Math.cos(a) + gaussian(rand) * noise, y: r * Math.sin(a) + gaussian(rand) * noise, label };
  });
}

/** k Gaussian blobs whose centres sit evenly around a circle, with a random rotation and jitter. */
export function blobs(n: number, k: number, spread: number, rand: Rand): (Point2 & { cluster: number })[] {
  const phase = rand() * 2 * Math.PI;
  const centres = Array.from({ length: k }, (_, c) => {
    const a = phase + (c / k) * 2 * Math.PI;
    const r = 0.55 + (rand() - 0.5) * 0.15;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
  return Array.from({ length: n }, (_, i) => {
    const c = i % k;
    return { x: centres[c].x + gaussian(rand) * spread, y: centres[c].y + gaussian(rand) * spread, cluster: c };
  });
}
