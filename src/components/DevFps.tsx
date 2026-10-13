import { useEffect, useRef } from "react";

// Dev-only frame-rate readout. MainContainer only imports this behind
// import.meta.env.DEV, so production builds don't include it.
// Shows frames per second and the slowest frame over the last half second.

const WINDOW_MS = 500;

const DevFps = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let worst = 0;
    let windowStart = performance.now();
    let last = windowStart;

    const tick = (now: number) => {
      frames++;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - windowStart >= WINDOW_MS) {
        const fps = Math.round((frames * 1000) / (now - windowStart));
        if (ref.current) ref.current.textContent = `${fps} fps · worst ${Math.round(worst)} ms`;
        frames = 0;
        worst = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 8,
        top: 72,
        zIndex: 10000,
        padding: "2px 6px",
        font: "12px/1.4 ui-monospace, monospace",
        background: "rgba(0, 0, 0, 0.6)",
        color: "#5eead4",
        pointerEvents: "none",
      }}
    >
      – fps
    </div>
  );
};

export default DevFps;
