import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createKMeans, kmeansStep, runToConvergence, type KMeansState } from "../../../lab/kmeans";
import { blobs, seeded, type Point2 } from "../../../lab/random";
import { CLUSTER_COLORS, drawGrid, prefersReducedMotion, prepare, projector, SCREEN } from "./canvas";

const SIZE = 320;
const STEP_MS = 450;

const KMeans = () => {
  const [k, setK] = useState(4);
  const [trueK, setTrueK] = useState(4);
  const [seed, setSeed] = useState(3);
  const [running, setRunning] = useState(false);
  const points = useMemo(() => blobs(180, trueK, 0.12, seeded(seed)), [trueK, seed]);
  // The centroid path lives in state with the run, so updates stay pure.
  const [run, setRun] = useState<{ state: KMeansState; trail: Point2[][] }>(() => {
    const s = createKMeans(points, k, seeded(seed + 100));
    return { state: s, trail: [s.centroids] };
  });
  const { state, trail } = run;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const reset = useCallback(() => {
    setRunning(false);
    const s = createKMeans(points, k, seeded(seed + 100));
    setRun({ state: s, trail: [s.centroids] });
  }, [points, k, seed]);

  useEffect(reset, [reset]);

  const step = useCallback(() => {
    setRun((r) => {
      const next = kmeansStep(r.state);
      return next === r.state ? r : { state: next, trail: [...r.trail, next.centroids] };
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    if (state.converged) {
      setRunning(false);
      return;
    }
    const t = setTimeout(step, STEP_MS);
    return () => clearTimeout(t);
  }, [running, state, step]);

  const toggleRun = () => {
    if (prefersReducedMotion()) {
      // No animation: jump straight to the converged result.
      setRun((r) => {
        const done = runToConvergence(r.state);
        return { state: done, trail: [...r.trail, done.centroids] };
      });
    } else {
      setRunning((r) => !r);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = prepare(canvas, SIZE, SIZE);
    const p = projector(SIZE);
    drawGrid(ctx, SIZE);
    state.points.forEach((pt, i) => {
      const a = state.assignments[i];
      ctx.beginPath();
      ctx.arc(p.x(pt.x), p.y(pt.y), 3, 0, Math.PI * 2);
      ctx.fillStyle = a >= 0 ? CLUSTER_COLORS[a % CLUSTER_COLORS.length] : SCREEN.text;
      ctx.fill();
    });
    // Centroid paths so far, then the current centroids as stamped squares.
    state.centroids.forEach((_, j) => {
      ctx.strokeStyle = SCREEN.paper;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      trail.forEach((cs, t) => {
        const c = cs[j];
        if (!c) return;
        if (t === 0) ctx.moveTo(p.x(c.x), p.y(c.y));
        else ctx.lineTo(p.x(c.x), p.y(c.y));
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
    state.centroids.forEach((c, j) => {
      const x = p.x(c.x);
      const y = p.y(c.y);
      ctx.fillStyle = CLUSTER_COLORS[j % CLUSTER_COLORS.length];
      ctx.strokeStyle = SCREEN.paper;
      ctx.lineWidth = 2;
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeRect(x - 6, y - 6, 12, 12);
    });
  }, [state, trail]);

  return (
    <div className="lab-demo">
      <div className="lab-stage">
        <canvas ref={canvasRef} role="img" aria-label="Points coloured by cluster with centroids" />
      </div>
      <div className="lab-controls">
        <label>
          k (clusters to find) {k}
          <input type="range" min={2} max={6} value={k} onChange={(e) => setK(Number(e.target.value))} />
        </label>
        <label>
          True blobs in the data {trueK}
          <input type="range" min={2} max={6} value={trueK} onChange={(e) => setTrueK(Number(e.target.value))} />
        </label>
        <div className="lab-buttons">
          <button type="button" className="lab-btn is-primary" onClick={toggleRun} disabled={state.converged}>
            {running ? "Pause" : "Run"}
          </button>
          <button type="button" className="lab-btn" onClick={step} disabled={running || state.converged}>
            Step
          </button>
          <button type="button" className="lab-btn" onClick={() => setSeed((s) => s + 1)}>
            New data
          </button>
          <button type="button" className="lab-btn" onClick={reset}>
            Re-seed
          </button>
        </div>
        <dl className="lab-stats">
          <dt>Iteration</dt>
          <dd>{state.iteration}</dd>
          <dt>Inertia</dt>
          <dd>{Number.isFinite(state.inertia) ? state.inertia.toFixed(3) : "–"}</dd>
          <dt>Status</dt>
          <dd className={state.converged ? "is-good" : undefined}>{state.converged ? "converged" : "running"}</dd>
        </dl>
        <p className="lab-note">
          Each step assigns every point to its nearest centroid, then moves each centroid to the mean of its points. Starting centroids come
          from k-means++, which spreads them out. Set k different from the true number of blobs to see it split or merge them.
        </p>
      </div>
    </div>
  );
};

export default KMeans;
