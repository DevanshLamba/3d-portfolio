import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seeded } from "../../../lab/random";
import { evaluate, leastSquares, mse, noisyCurve, PolynomialGD, trueCurve } from "../../../lab/regression";
import { drawGrid, prepare, projector, SCREEN, useFrameLoop } from "./canvas";

const SIZE = 320;
const MAX_ITER = 20000;

const Regression = () => {
  const [degree, setDegree] = useState(3);
  const [seed, setSeed] = useState(2);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ iteration: 0, train: 0, test: 0, exact: false });
  const { train, test } = useMemo(() => {
    const rand = seeded(seed);
    return { train: noisyCurve(14, 0.15, rand), test: noisyCurve(40, 0.15, rand) };
  }, [seed]);
  const gdRef = useRef(new PolynomialGD(degree));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = prepare(canvas, SIZE, SIZE);
    const px = projector(SIZE, 1.1);
    const py = projector(SIZE, 1.6);
    drawGrid(ctx, SIZE);
    const curve = (f: (x: number) => number, color: string, width: number, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = -1.05 + (i / 200) * 2.1;
        const y = Math.max(-1.6, Math.min(1.6, f(x)));
        if (i === 0) ctx.moveTo(px.x(x), py.y(y));
        else ctx.lineTo(px.x(x), py.y(y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve(trueCurve, SCREEN.mint, 1.5, [5, 4]);
    for (const p of test) {
      ctx.beginPath();
      ctx.arc(px.x(p.x), py.y(p.y), 3, 0, Math.PI * 2);
      ctx.strokeStyle = SCREEN.text;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (const p of train) {
      ctx.beginPath();
      ctx.arc(px.x(p.x), py.y(p.y), 4, 0, Math.PI * 2);
      ctx.fillStyle = SCREEN.amber;
      ctx.fill();
    }
    curve((x) => evaluate(gdRef.current.weights, x), SCREEN.rust, 2.5);
  }, [train, test]);

  const publish = useCallback(
    (exact = false) => {
      const w = gdRef.current.weights;
      setStats({ iteration: gdRef.current.iteration, train: mse(w, train), test: mse(w, test), exact });
      draw();
    },
    [train, test, draw]
  );

  const reset = useCallback(() => {
    setRunning(false);
    gdRef.current = new PolynomialGD(degree);
    publish();
  }, [degree, publish]);

  useEffect(reset, [reset]);

  useFrameLoop(running, (budget) => {
    const gd = gdRef.current;
    const start = performance.now();
    while (performance.now() - start < budget && gd.iteration < MAX_ITER) gd.step(train);
    if (++frame.current % 3 === 0 || gd.iteration >= MAX_ITER) publish();
    if (gd.iteration >= MAX_ITER) {
      setRunning(false);
      return false;
    }
  });

  const solveExactly = () => {
    setRunning(false);
    gdRef.current.weights = leastSquares(train, degree);
    publish(true);
  };

  return (
    <div className="lab-demo">
      <div className="lab-stage">
        <canvas ref={canvasRef} role="img" aria-label="Training points, held-out points, the true curve and the fitted polynomial" />
        <p className="lab-legend">
          <span className="is-amber">● training</span> <span>○ held out</span> <span className="is-mint">- - true curve</span>{" "}
          <span className="is-rust">— fit</span>
        </p>
      </div>
      <div className="lab-controls">
        <label>
          Polynomial degree {degree}
          <input type="range" min={1} max={12} value={degree} onChange={(e) => setDegree(Number(e.target.value))} />
        </label>
        <div className="lab-buttons">
          <button type="button" className="lab-btn is-primary" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : stats.iteration ? "Resume descent" : "Gradient descent"}
          </button>
          <button type="button" className="lab-btn" onClick={solveExactly}>
            Solve exactly
          </button>
          <button type="button" className="lab-btn" onClick={() => setSeed((s) => s + 1)}>
            New data
          </button>
        </div>
        <dl className="lab-stats">
          <dt>Iteration</dt>
          <dd>{stats.exact ? "exact" : stats.iteration}</dd>
          <dt>Train MSE</dt>
          <dd>{stats.train.toFixed(4)}</dd>
          <dt>Held-out MSE</dt>
          <dd className={stats.test > stats.train * 3 && stats.train < 0.02 ? "is-bad" : undefined}>{stats.test.toFixed(4)}</dd>
        </dl>
        <p className="lab-note">
          14 noisy training points from a sine curve. Push the degree up and press “Solve exactly”: training error falls towards zero while
          held-out error climbs. That gap is overfitting.
        </p>
      </div>
    </div>
  );
};

export default Regression;
