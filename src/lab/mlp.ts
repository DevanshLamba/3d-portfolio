// A multi-layer perceptron for 2-D binary classification with backprop
// derived by hand: tanh hidden layers, a sigmoid output, binary cross-entropy
// loss, full-batch gradients and an Adam optimiser.

import { gaussian, seeded, type Labelled } from "./random.ts";

interface Layer {
  inputs: number;
  outputs: number;
  /** Row-major outputs × inputs. */
  w: Float64Array;
  b: Float64Array;
}

export interface MLPOptions {
  /** Layer widths including input and output, e.g. [2, 16, 16, 1]. */
  sizes: number[];
  seed?: number;
  learningRate?: number;
}

const BETA1 = 0.9;
const BETA2 = 0.999;
const EPS = 1e-8;

export class MLP {
  readonly sizes: number[];
  readonly layers: Layer[];
  learningRate: number;
  epoch = 0;
  private readonly m: Float64Array[];
  private readonly v: Float64Array[];

  constructor(options: MLPOptions) {
    const { sizes } = options;
    if (sizes.length < 2 || sizes[sizes.length - 1] !== 1) throw new Error("sizes must end in a single output unit");
    this.sizes = sizes;
    this.learningRate = options.learningRate ?? 0.03;
    const rand = seeded(options.seed ?? 7);
    this.layers = sizes.slice(1).map((outputs, i) => {
      const inputs = sizes[i];
      // Xavier/Glorot initialisation suits tanh.
      const scale = Math.sqrt(1 / inputs);
      return {
        inputs,
        outputs,
        w: Float64Array.from({ length: outputs * inputs }, () => gaussian(rand) * scale),
        b: new Float64Array(outputs),
      };
    });
    // Adam moments, one flat array per layer: weights then biases.
    this.m = this.layers.map((l) => new Float64Array(l.w.length + l.b.length));
    this.v = this.layers.map((l) => new Float64Array(l.w.length + l.b.length));
  }

  get parameterCount(): number {
    return this.layers.reduce((n, l) => n + l.w.length + l.b.length, 0);
  }

  /** Activations of every layer, input first. */
  forward(x: number, y: number): Float64Array[] {
    const acts: Float64Array[] = [Float64Array.of(x, y)];
    this.layers.forEach((layer, li) => {
      const input = acts[li];
      const out = new Float64Array(layer.outputs);
      const last = li === this.layers.length - 1;
      for (let o = 0; o < layer.outputs; o++) {
        let z = layer.b[o];
        const row = o * layer.inputs;
        for (let i = 0; i < layer.inputs; i++) z += layer.w[row + i] * input[i];
        out[o] = last ? 1 / (1 + Math.exp(-z)) : Math.tanh(z);
      }
      acts.push(out);
    });
    return acts;
  }

  predict(x: number, y: number): number {
    const acts = this.forward(x, y);
    return acts[acts.length - 1][0];
  }

  loss(points: Labelled[]): number {
    let total = 0;
    for (const p of points) {
      const q = Math.min(1 - 1e-12, Math.max(1e-12, this.predict(p.x, p.y)));
      total += -(p.label * Math.log(q) + (1 - p.label) * Math.log(1 - q));
    }
    return total / points.length;
  }

  accuracy(points: Labelled[]): number {
    let right = 0;
    for (const p of points) if ((this.predict(p.x, p.y) >= 0.5 ? 1 : 0) === p.label) right++;
    return right / points.length;
  }

  /** Mean gradients of the loss over `points`, laid out like the Adam moments. */
  gradients(points: Labelled[]): Float64Array[] {
    const grads = this.layers.map((l) => new Float64Array(l.w.length + l.b.length));
    const last = this.layers.length - 1;

    for (const p of points) {
      const acts = this.forward(p.x, p.y);
      // Sigmoid + cross-entropy: dL/dz at the output is simply (prediction − label).
      let delta = Float64Array.of(acts[last + 1][0] - p.label);

      for (let li = last; li >= 0; li--) {
        const layer = this.layers[li];
        const input = acts[li];
        const g = grads[li];
        for (let o = 0; o < layer.outputs; o++) {
          const row = o * layer.inputs;
          for (let i = 0; i < layer.inputs; i++) g[row + i] += delta[o] * input[i];
          g[layer.w.length + o] += delta[o];
        }
        if (li === 0) break;
        // Propagate through the weights, then through tanh: d tanh(z)/dz = 1 − a².
        const prev = new Float64Array(layer.inputs);
        for (let i = 0; i < layer.inputs; i++) {
          let sum = 0;
          for (let o = 0; o < layer.outputs; o++) sum += layer.w[o * layer.inputs + i] * delta[o];
          prev[i] = sum * (1 - input[i] * input[i]);
        }
        delta = prev;
      }
    }

    const n = points.length;
    grads.forEach((g) => g.forEach((_, k) => (g[k] /= n)));
    return grads;
  }

  /** One full-batch Adam step. Returns the loss before the step. */
  trainEpoch(points: Labelled[]): number {
    const before = this.loss(points);
    const grads = this.gradients(points);
    this.epoch++;
    const t = this.epoch;
    const correction1 = 1 - BETA1 ** t;
    const correction2 = 1 - BETA2 ** t;

    this.layers.forEach((layer, li) => {
      const g = grads[li];
      const m = this.m[li];
      const v = this.v[li];
      for (let k = 0; k < g.length; k++) {
        m[k] = BETA1 * m[k] + (1 - BETA1) * g[k];
        v[k] = BETA2 * v[k] + (1 - BETA2) * g[k] * g[k];
        const step = (this.learningRate * (m[k] / correction1)) / (Math.sqrt(v[k] / correction2) + EPS);
        if (k < layer.w.length) layer.w[k] -= step;
        else layer.b[k - layer.w.length] -= step;
      }
    });
    return before;
  }
}
