import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { selfAttention, softmax } from "../../src/lab/attention.ts";
import { createKMeans, runToConvergence } from "../../src/lab/kmeans.ts";
import { MLP } from "../../src/lab/mlp.ts";
import { buildPlaygroundIndex, chunkText, queryPlayground, SAMPLE_TEXT } from "../../src/lab/ragPlayground.ts";
import { blobs, seeded, spirals, xor } from "../../src/lab/random.ts";
import { leastSquares, mse, noisyCurve, PolynomialGD } from "../../src/lab/regression.ts";

describe("neural network", () => {
  test("hand-derived gradients match numerical gradients", () => {
    const net = new MLP({ sizes: [2, 5, 4, 1], seed: 3 });
    const data = xor(12, 0.05, seeded(1));
    const analytic = net.gradients(data);
    const h = 1e-5;
    let checked = 0;
    net.layers.forEach((layer, li) => {
      for (const k of [0, 3, layer.w.length - 1]) {
        const original = layer.w[k];
        layer.w[k] = original + h;
        const up = net.loss(data);
        layer.w[k] = original - h;
        const down = net.loss(data);
        layer.w[k] = original;
        const numeric = (up - down) / (2 * h);
        assert.ok(Math.abs(numeric - analytic[li][k]) < 1e-6, `layer ${li} w${k}: ${numeric} vs ${analytic[li][k]}`);
        checked++;
      }
      const bIndex = layer.w.length;
      const original = layer.b[0];
      layer.b[0] = original + h;
      const up = net.loss(data);
      layer.b[0] = original - h;
      const down = net.loss(data);
      layer.b[0] = original;
      assert.ok(Math.abs((up - down) / (2 * h) - analytic[li][bIndex]) < 1e-6, `layer ${li} bias`);
    });
    assert.equal(checked, 9);
  });

  test("learns two interleaved spirals", () => {
    const data = spirals(200, 0.02, seeded(5));
    const net = new MLP({ sizes: [2, 16, 16, 1], seed: 2, learningRate: 0.03 });
    const startLoss = net.loss(data);
    for (let i = 0; i < 1500; i++) net.trainEpoch(data);
    assert.ok(net.loss(data) < startLoss / 5, `loss ${startLoss} -> ${net.loss(data)}`);
    assert.ok(net.accuracy(data) >= 0.95, `accuracy ${net.accuracy(data)}`);
  });
});

describe("k-means", () => {
  test("recovers well-separated blobs", () => {
    const rand = seeded(9);
    const points = blobs(150, 3, 0.06, rand);
    const final = runToConvergence(createKMeans(points, 3, rand));
    assert.equal(final.converged, true);
    // Each true blob should land almost entirely in one cluster.
    for (let c = 0; c < 3; c++) {
      const labels = points.flatMap((p, i) => (p.cluster === c ? [final.assignments[i]] : []));
      const counts = new Map<number, number>();
      labels.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1));
      assert.ok(Math.max(...counts.values()) / labels.length > 0.95, `blob ${c}`);
    }
  });

  test("inertia never increases between iterations", async () => {
    const { kmeansStep } = await import("../../src/lab/kmeans.ts");
    const rand = seeded(4);
    let s = createKMeans(blobs(120, 4, 0.2, rand), 4, rand);
    let last = Infinity;
    for (let i = 0; i < 20 && !s.converged; i++) {
      s = kmeansStep(s);
      assert.ok(s.inertia <= last + 1e-9);
      last = s.inertia;
    }
  });
});

describe("polynomial regression", () => {
  const rand = seeded(12);
  const train = noisyCurve(12, 0.15, rand);
  const holdout = noisyCurve(60, 0.15, rand);

  test("gradient descent reduces training error", () => {
    const gd = new PolynomialGD(3);
    const first = gd.step(train);
    for (let i = 0; i < 2000; i++) gd.step(train);
    assert.ok(mse(gd.weights, train) < first / 3);
  });

  test("a high degree fits the training noise and generalises worse", () => {
    const low = leastSquares(train, 3);
    const high = leastSquares(train, 11);
    assert.ok(mse(high, train) < mse(low, train) / 10, "degree 11 should nearly interpolate");
    assert.ok(mse(high, holdout) > mse(low, holdout) * 2, "and do worse on unseen points");
  });
});

describe("self-attention", () => {
  const result = selfAttention("the cat saw the dog near the door");

  test("every attention row is a probability distribution", () => {
    for (const head of result.heads) {
      for (const row of head.weights) {
        assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-9);
        assert.ok(row.every((w) => w >= 0));
      }
    }
    assert.deepEqual(softmax([1, 1]), [0.5, 0.5]);
  });

  test("the content head links repeated words", () => {
    const content = result.heads.find((h) => h.name === "Content")!;
    const the = result.tokens.map((t, i) => (t === "the" ? i : -1)).filter((i) => i >= 0);
    const row = content.weights[the[0]];
    const top = row.map((w, j) => ({ w, j })).sort((a, b) => b.w - a.w).slice(0, the.length).map((x) => x.j).sort();
    assert.deepEqual(top, the);
  });

  test("the position head prefers nearby tokens", () => {
    const position = result.heads.find((h) => h.name === "Position")!;
    const row = position.weights[3];
    assert.ok(row[3] > row[0] && row[4] > row[7]);
  });
});

describe("RAG playground", () => {
  test("chunks respect the size limit and carry the overlap", () => {
    const chunks = chunkText(SAMPLE_TEXT, 220, 60);
    assert.ok(chunks.length >= 3);
    for (const c of chunks.slice(0, -1)) assert.ok(c.text.length <= 220 + 60, `chunk ${c.index} is ${c.text.length}`);
    assert.equal(chunks[0].overlapChars, 0);
    assert.ok(chunks.slice(1).every((c) => c.overlapChars > 0));
    const noOverlap = chunkText(SAMPLE_TEXT, 220, 0);
    assert.ok(noOverlap.slice(1).every((c) => c.overlapChars === 0));
  });

  test("queries find the chunk that answers them", () => {
    const chunks = chunkText(SAMPLE_TEXT, 220, 40);
    const index = buildPlaygroundIndex(chunks);
    const { result, relevant } = queryPlayground(index, "why use overlap between chunks?");
    assert.equal(relevant, true);
    assert.match(result.hits[0].text, /Overlap repeats/);
    assert.equal(queryPlayground(index, "favourite pizza").relevant, false);
  });
});
