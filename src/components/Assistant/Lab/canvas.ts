import { useEffect, useRef } from "react";

// Colours of the Lab's "CRT screen". The rest of the site is light; the Lab
// is the one dark, phosphor-lit object, like an old terminal on a desk.
export const SCREEN = {
  bg: "#221d18",
  grid: "rgba(240, 189, 130, 0.10)",
  axis: "rgba(240, 189, 130, 0.28)",
  text: "rgba(241, 230, 207, 0.75)",
  amber: "#f0bd82",
  amberDeep: "#e0954a",
  mint: "#9ccbb8",
  rust: "#e08a73",
  paper: "#f1e6cf",
};

export const CLUSTER_COLORS = [SCREEN.amber, SCREEN.mint, SCREEN.rust, "#b9a7e0", "#d9cf7a", "#7fb0d6"];

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Sizes the canvas for the device pixel ratio and returns a context in CSS pixels. */
export function prepare(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = SCREEN.bg;
  ctx.fillRect(0, 0, width, height);
  return ctx;
}

/** Maps data coordinates in [-range, range] to canvas pixels (y up). */
export function projector(size: number, range = 1.2) {
  return {
    x: (v: number) => ((v + range) / (2 * range)) * size,
    y: (v: number) => size - ((v + range) / (2 * range)) * size,
    inverse: (px: number) => (px / size) * 2 * range - range,
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D, size: number, steps = 8) {
  ctx.strokeStyle = SCREEN.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < steps; i++) {
    const p = (i / steps) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
}

/**
 * Runs `tick` once per animation frame while `running` is true. `tick` gets a
 * time budget in ms so heavy work can stop early and leave the frame to the
 * rest of the page. Returning false stops the loop.
 */
export function useFrameLoop(running: boolean, tick: (budgetMs: number) => boolean | void) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      if (tickRef.current(6) === false) return;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
