import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MLP } from "../../../lab/mlp";
import { circles, seeded, spirals, xor, type Labelled } from "../../../lab/random";
import { drawGrid, prepare, projector, SCREEN, useFrameLoop } from "./canvas";

type Dataset = "spirals" | "xor" | "circles";
const SIZE = 320;
const GRID = 48;
const MAX_EPOCHS = 3000;

const DATASETS: Record<Dataset, (seed: number) => Labelled[]> = {
  spirals: (s) => spirals(200, 0.03, seeded(s)),
  xor: (s) => xor(200, 0.04, seeded(s)),
  circles: (s) => circles(200, 0.05, seeded(s)),
};

const NeuralNet = () => {
  const [dataset, setDataset] = useState<Dataset>("spirals");
  const [width, setWidth] = useState(16);
  const [lr, setLr] = useState(0.03);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ epoch: 0, loss: 0, accuracy: 0 });
  const data = useMemo(() => DATASETS[dataset](seed), [dataset, seed]);
  const netRef = useRef<MLP>(new MLP({ sizes: [2, width, width, 1], seed, learningRate: lr }));
  const lossHistory = useRef<number[]>([]);
  const boardRef = useRef<HTMLCanvasElement>(null);
  const lossRef = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  const draw = useCallback(() => {
    const net = netRef.current;
    const board = boardRef.current;
    if (board) {
      const ctx = prepare(board, SIZE, SIZE);
      const p = projector(SIZE);
      const cell = SIZE / GRID;
      for (let gx = 0; gx < GRID; gx++) {
        for (let gy = 0; gy < GRID; gy++) {
          const prob = net.predict(p.inverse((gx + 0.5) * cell), -p.inverse((gy + 0.5) * cell));
          const strength = Math.abs(prob - 0.5) * 2;
          ctx.fillStyle = prob >= 0.5 ? `rgba(156, 203, 184, ${0.08 + strength * 0.42})` : `rgba(240, 189, 130, ${0.08 + strength * 0.42})`;
          ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
        }
      }
      drawGrid(ctx, SIZE);
      for (const pt of data) {
        ctx.beginPath();
        ctx.arc(p.x(pt.x), p.y(pt.y), 3.2, 0, Math.PI * 2);
        ctx.fillStyle = pt.label ? SCREEN.mint : SCREEN.amber;
        ctx.fill();
        ctx.strokeStyle = SCREEN.bg;
        ctx.stroke();
      }
    }
    const lossCanvas = lossRef.current;
    if (lossCanvas) {
      const w = 320;
      const h = 60;
      const ctx = prepare(lossCanvas, w, h);
      const hist = lossHistory.current;
      if (hist.length > 1) {
        const max = Math.max(...hist);
        ctx.strokeStyle = SCREEN.amber;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        hist.forEach((l, i) => {
          const x = (i / (hist.length - 1)) * w;
          const y = h - 4 - (l / max) * (h - 8);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
  }, [data]);

  const reset = useCallback(() => {
    setRunning(false);
    netRef.current = new MLP({ sizes: [2, width, width, 1], seed, learningRate: lr });
    lossHistory.current = [];
    setStats({ epoch: 0, loss: netRef.current.loss(data), accuracy: netRef.current.accuracy(data) });
    draw();
  }, [width, seed, lr, data, draw]);

  // A new dataset, width or seed means a fresh network.
  useEffect(reset, [dataset, width, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    netRef.current.learningRate = lr;
  }, [lr]);

  const train = (epochs: number, budgetMs: number) => {
    const net = netRef.current;
    const start = performance.now();
    let n = 0;
    while (n < epochs && performance.now() - start < budgetMs && net.epoch < MAX_EPOCHS) {
      const loss = net.trainEpoch(data);
      if (net.epoch % 5 === 0) lossHistory.current.push(loss);
      n++;
    }
    return net.epoch < MAX_EPOCHS;
  };

  const publish = () => {
    const net = netRef.current;
    setStats({ epoch: net.epoch, loss: net.loss(data), accuracy: net.accuracy(data) });
    draw();
  };

  useFrameLoop(running, (budget) => {
    const more = train(40, budget);
    if (++frame.current % 4 === 0 || !more) publish();
    if (!more) {
      setRunning(false);
      return false;
    }
  });

  return (
    <div className="lab-demo">
      <div className="lab-stage">
        <canvas ref={boardRef} aria-label="Decision boundary and training points" role="img" />
        <canvas ref={lossRef} aria-label="Training loss over time" role="img" />
      </div>
      <div className="lab-controls">
        <label>
          Dataset
          <select value={dataset} onChange={(e) => setDataset(e.target.value as Dataset)}>
            <option value="spirals">Two spirals</option>
            <option value="xor">XOR</option>
            <option value="circles">Circles</option>
          </select>
        </label>
        <label>
          Hidden width
          <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
            {[4, 8, 16, 24].map((w) => (
              <option key={w} value={w}>
                2 × {w}
              </option>
            ))}
          </select>
        </label>
        <label>
          Learning rate {lr.toFixed(3)}
          <input type="range" min={0.005} max={0.1} step={0.005} value={lr} onChange={(e) => setLr(Number(e.target.value))} />
        </label>
        <div className="lab-buttons">
          <button type="button" className="lab-btn is-primary" onClick={() => setRunning((r) => !r)} disabled={stats.epoch >= MAX_EPOCHS}>
            {running ? "Pause" : stats.epoch ? "Resume" : "Train"}
          </button>
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              train(50, 50);
              publish();
            }}
            disabled={running}
          >
            +50 epochs
          </button>
          <button type="button" className="lab-btn" onClick={() => setSeed((s) => s + 1)}>
            New data
          </button>
          <button type="button" className="lab-btn" onClick={reset}>
            Reset
          </button>
        </div>
        <dl className="lab-stats">
          <dt>Epoch</dt>
          <dd>{stats.epoch}</dd>
          <dt>Loss</dt>
          <dd>{stats.loss.toFixed(4)}</dd>
          <dt>Accuracy</dt>
          <dd>{(stats.accuracy * 100).toFixed(1)}%</dd>
          <dt>Parameters</dt>
          <dd>{netRef.current.parameterCount}</dd>
        </dl>
        <p className="lab-note">
          2 → {width} → {width} → 1, tanh hidden layers, sigmoid output, cross-entropy loss, Adam. Backprop is written by hand and
          checked against numerical gradients in the test suite.
        </p>
      </div>
    </div>
  );
};

export default NeuralNet;
