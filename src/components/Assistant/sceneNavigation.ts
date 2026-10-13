import { smoother } from "../Navbar";

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Brings a page section into view. The character camera is driven by the
 * ScrollTrigger timelines in GsapScroll.ts, so scrolling to a section is what
 * moves the 3D scene there. Same split as the navbar links: ScrollSmoother on
 * desktop, native scrolling on smaller screens. Under reduced motion it jumps.
 */
export function navigateToSection(targetId: string): boolean {
  const el = document.getElementById(targetId);
  if (!el) return false;
  const animate = !prefersReducedMotion();
  if (window.innerWidth > 1024 && smoother) {
    smoother.scrollTo(el, animate, "top top");
  } else {
    el.scrollIntoView({ behavior: animate ? "smooth" : "auto", block: "start" });
  }
  return true;
}
