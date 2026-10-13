// Polynomial regression on noisy 1-D data, fitted two ways: gradient descent
// on mean squared error (animated in the demo) and the exact least-squares
// solution (to show where high degrees end up: interpolating the noise).

import { gaussian, type Point2, type Rand } from "./random.ts";

/** y = 0.8·sin(πx) plus Gaussian noise, x uniform in [-1, 1]. */
export function noisyCurve(n: number, noise: number, rand: Rand): Point2[] {
  return Array.from({ length: n }, () => {
    const x = rand() * 2 - 1;
    return { x, y: 0.8 * Math.sin(Math.PI * x) + gaussian(rand) * noise };
  }).sort((a, b) => a.x - b.x);
}

export function trueCurve(x: number): number {
  return 0.8 * Math.sin(Math.PI * x);
}

export function features(x: number, degree: number): number[] {
  const out = [1];
  for (let d = 1; d <= degree; d++) out.push(out[d - 1] * x);
  return out;
}

export function evaluate(weights: number[], x: number): number {
  let y = 0;
  for (let d = weights.length - 1; d >= 0; d--) y = y * x + weights[d];
  return y;
}

export function mse(weights: number[], points: Point2[]): number {
  return points.reduce((s, p) => s + (evaluate(weights, p.x) - p.y) ** 2, 0) / points.length;
}

/** Gradient descent (Adam) on MSE. Mutable so the demo can step it every frame. */
export class PolynomialGD {
  readonly degree: number;
  weights: number[];
  iteration = 0;
  learningRate: number;
  private m: number[];
  private v: number[];

  constructor(degree: number, learningRate = 0.05) {
    this.degree = degree;
    this.learningRate = learningRate;
    this.weights = new Array(degree + 1).fill(0);
    this.m = new Array(degree + 1).fill(0);
    this.v = new Array(degree + 1).fill(0);
  }

  step(points: Point2[]): number {
    const grad = new Array(this.degree + 1).fill(0);
    for (const p of points) {
      const f = features(p.x, this.degree);
      const err = evaluate(this.weights, p.x) - p.y;
      for (let d = 0; d <= this.degree; d++) grad[d] += (2 * err * f[d]) / points.length;
    }
    this.iteration++;
    const t = this.iteration;
    for (let d = 0; d <= this.degree; d++) {
      this.m[d] = 0.9 * this.m[d] + 0.1 * grad[d];
      this.v[d] = 0.999 * this.v[d] + 0.001 * grad[d] * grad[d];
      const mh = this.m[d] / (1 - 0.9 ** t);
      const vh = this.v[d] / (1 - 0.999 ** t);
      this.weights[d] -= (this.learningRate * mh) / (Math.sqrt(vh) + 1e-8);
    }
    return mse(this.weights, points);
  }
}

/** Exact least squares via the normal equations, (XᵀX + λI)w = Xᵀy, with partial pivoting. */
export function leastSquares(points: Point2[], degree: number, lambda = 1e-10): number[] {
  const n = degree + 1;
  const a = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (const p of points) {
    const f = features(p.x, degree);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) a[i][j] += f[i] * f[j];
      a[i][n] += f[i] * p.y;
    }
  }
  for (let i = 0; i < n; i++) a[i][i] += lambda;

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col] / a[col][col];
      for (let c = col; c <= n; c++) a[r][c] -= factor * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}
