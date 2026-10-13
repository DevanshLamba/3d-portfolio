// Guided tour: an ordered list of stops plus a small controller that emits
// events. The assistant core has no idea how the page reacts; the scene
// integration listens for "stop" events and moves the camera/scroll.

import type { ProfileData, TourStopConfig } from "../../data/profile.ts";
import { redactSensitive, usableLink } from "../knowledge.ts";
import { splitSentences } from "../text.ts";

export interface TourStop {
  id: string;
  targetId: string;
  title: string;
  narration: string;
}

export type TourEventType = "start" | "stop" | "end";

export interface TourEventDetail {
  type: TourEventType;
  index: number;
  total: number;
  stop: TourStop | null;
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function count(n: number): string {
  const word = NUMBER_WORDS[n] ?? String(n);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function titleCase(text: string): string {
  return text === text.toUpperCase()
    ? text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAi\b/g, "AI")
    : text;
}

function narrate(p: ProfileData, stop: TourStopConfig): string {
  switch (stop.kind) {
    case "intro":
      return `${p.name}: ${p.headline.toLowerCase()}. This tour walks through the page one section at a time.`;
    case "about":
      return `In his words: “${splitSentences(p.about)[0]}”`;
    case "services":
      return `${count(p.services.length)} focus areas: ${listOf(p.services.map((s) => `${titleCase(s.title)} (${s.subtitle})`))}.`;
    case "career":
      return `The timeline: ${listOf(p.career.map((c) => `${c.title.split(" — ")[0]} (${c.role})`))}.`;
    case "work":
      return `${count(p.projects.length)} projects: ${listOf(p.projects.map((proj) => proj.title))}. Use the arrows to flip between them.`;
    case "contact": {
      const channels = p.contact.socials.filter((s) => usableLink(s.href)).map((s) => s.label);
      return `Find him on ${listOf(channels)}.${usableLink(p.resume) ? " The résumé link sits in the corner." : ""}`;
    }
    case "respond":
      return `Want to talk? Leave your name, email and a short message here and ${p.firstName} will reply by email.`;
  }
}

export function buildTourStops(p: ProfileData): TourStop[] {
  return p.assistant.tour.map((stop) => ({
    id: stop.id,
    targetId: stop.targetId,
    title: stop.title,
    narration: redactSensitive(narrate(p, stop)),
  }));
}

export interface TourOptions {
  /** Filters stops at start, e.g. to skip sections not rendered on mobile. */
  isAvailable?: (stop: TourStop) => boolean;
}

export type Tour = ReturnType<typeof createTour>;

export function createTour(allStops: TourStop[], options: TourOptions = {}) {
  const events = new EventTarget();
  let stops: TourStop[] = [];
  let index = -1;

  const snapshot = (type: TourEventType): TourEventDetail => ({
    type,
    index,
    total: stops.length,
    stop: index >= 0 ? stops[index] : null,
  });

  const emit = (type: TourEventType) => {
    events.dispatchEvent(new CustomEvent<TourEventDetail>(type, { detail: snapshot(type) }));
  };

  const goTo = (i: number) => {
    if (index < 0 || i < 0 || i >= stops.length || i === index) return;
    index = i;
    emit("stop");
  };

  const end = () => {
    if (index < 0) return;
    emit("end");
    index = -1;
    stops = [];
  };

  return {
    /** Every configured stop, regardless of availability. */
    stops: allStops,
    get active() {
      return index >= 0;
    },
    get state(): TourEventDetail {
      return snapshot("stop");
    },
    start(fromId?: string) {
      stops = allStops.filter((s) => options.isAvailable?.(s) ?? true);
      if (!stops.length) return;
      index = Math.max(0, stops.findIndex((s) => s.id === fromId));
      emit("start");
      emit("stop");
    },
    next() {
      if (index >= stops.length - 1) end();
      else goTo(index + 1);
    },
    prev() {
      goTo(index - 1);
    },
    goTo,
    end,
    /** Subscribes to tour events; returns an unsubscribe function. */
    on(type: TourEventType, handler: (detail: TourEventDetail) => void): () => void {
      const listener = (e: Event) => handler((e as CustomEvent<TourEventDetail>).detail);
      events.addEventListener(type, listener);
      return () => events.removeEventListener(type, listener);
    },
  };
}
