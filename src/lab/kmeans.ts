// k-means (Lloyd's algorithm) with k-means++ seeding, exposed one iteration
// at a time so the demo can show centroids moving.

import type { Point2, Rand } from "./random.ts";

export interface KMeansState {
  points: Point2[];
  centroids: Point2[];
  assignments: Int32Array;
  iteration: number;
  /** Sum of squared distances from each point to its centroid. */
  inertia: number;
  converged: boolean;
}

const dist2 = (a: Point2, b: Point2) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** k-means++: each new centre is picked with probability ∝ squared distance to the nearest chosen one. */
export function seedCentroids(points: Point2[], k: number, rand: Rand): Point2[] {
  const centroids: Point2[] = [{ ...points[Math.floor(rand() * points.length)] }];
  while (centroids.length < k) {
    const d = points.map((p) => Math.min(...centroids.map((c) => dist2(p, c))));
    const total = d.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let idx = 0;
    while (idx < d.length - 1 && r > d[idx]) r -= d[idx++];
    centroids.push({ ...points[idx] });
  }
  return centroids;
}

export function createKMeans(points: Point2[], k: number, rand: Rand): KMeansState {
  return {
    points,
    centroids: seedCentroids(points, k, rand),
    assignments: new Int32Array(points.length).fill(-1),
    iteration: 0,
    inertia: Infinity,
    converged: false,
  };
}

/** One assign-then-update iteration. Returns a new state; the input is untouched. */
export function kmeansStep(state: KMeansState): KMeansState {
  if (state.converged) return state;
  const { points, centroids } = state;
  const assignments = new Int32Array(points.length);
  let changed = false;
  let inertia = 0;

  points.forEach((p, i) => {
    let best = 0;
    let bestD = Infinity;
    centroids.forEach((c, j) => {
      const d = dist2(p, c);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    assignments[i] = best;
    inertia += bestD;
    if (best !== state.assignments[i]) changed = true;
  });

  const next = centroids.map((c, j) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    points.forEach((p, i) => {
      if (assignments[i] === j) {
        sx += p.x;
        sy += p.y;
        n++;
      }
    });
    // An empty cluster keeps its centre rather than collapsing to NaN.
    return n ? { x: sx / n, y: sy / n } : c;
  });

  return { points, centroids: next, assignments, iteration: state.iteration + 1, inertia, converged: !changed };
}

export function runToConvergence(state: KMeansState, maxIterations = 100): KMeansState {
  let s = state;
  for (let i = 0; i < maxIterations && !s.converged; i++) s = kmeansStep(s);
  return s;
}
