import { useEffect, useState } from "react";
import type { Tour, TourEventDetail } from "../../assistant";
import { navigateToSection } from "./sceneNavigation";

/**
 * Wires tour events to the page: each stop scrolls the scene to its section.
 * While a tour runs, arrow keys step through it and Escape ends it.
 */
export function useSceneTour(tour: Tour): TourEventDetail | null {
  const [state, setState] = useState<TourEventDetail | null>(tour.active ? tour.state : null);

  useEffect(() => {
    const offStop = tour.on("stop", (detail) => {
      setState(detail);
      if (detail.stop) navigateToSection(detail.stop.targetId);
    });
    const offEnd = tour.on("end", () => setState(null));
    return () => {
      offStop();
      offEnd();
    };
  }, [tour]);

  const active = state !== null;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      // Key events can target window or document, which have no closest().
      if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") tour.next();
      else if (e.key === "ArrowLeft") tour.prev();
      else if (e.key === "Escape") tour.end();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, tour]);

  return state;
}
