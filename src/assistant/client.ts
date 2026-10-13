// Main-thread API. Heavy work goes to a Web Worker; if workers are missing or
// the worker fails to start, the same core runs in-thread instead. Pitch and
// tour are cheap data lookups and stay on the main thread.

import { profile } from "../data/profile.ts";
import type { AskOptions, CoreMethod } from "./core.ts";
import type { LLMProvider } from "./llm.ts";
import type { SearchResult } from "./retrieval.ts";
import { looksLikeJobDescription } from "./skills/detect.ts";
import { AUDIENCES, buildPitch, type Pitch } from "./skills/pitch.ts";
import { buildTourStops, createTour, type Tour, type TourEventDetail } from "./skills/tour.ts";
import type { AgentRun, AgentStep, AskResult, Citation, JobMatchResult, MatchStatus, MatchEvidence, ToolSchema } from "./types.ts";
import type { WorkerRequest, WorkerResponse } from "./worker.ts";

import { TOUR_WINDOW_EVENT } from "./events.ts";

export { ASSISTANT_STATE_EVENT, TOUR_WINDOW_EVENT, type AssistantActivity } from "./events.ts";

interface Backend {
  readonly kind: "worker" | "inline";
  call<T>(method: CoreMethod, args: unknown[], onEvent?: (event: unknown) => void): Promise<T>;
  dispose(): void;
}

class WorkerUnavailableError extends Error {}

function createInlineBackend(): Backend {
  let core: Promise<{ dispatch: typeof import("./core.ts").dispatch; core: import("./core.ts").AssistantCore }> | null = null;
  const load = () =>
    (core ??= import("./core.ts").then((m) => ({ dispatch: m.dispatch, core: m.createAssistantCore() })));
  return {
    kind: "inline",
    async call<T>(method: CoreMethod, args: unknown[], onEvent?: (event: unknown) => void) {
      const { dispatch, core: c } = await load();
      return dispatch(c, method, args, onEvent) as T;
    },
    dispose() {
      core = null;
    },
  };
}

function createWorkerBackend(): Backend | null {
  if (typeof Worker === "undefined") return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "portfolio-assistant" });
  } catch {
    return null;
  }

  let nextId = 1;
  let broken = false;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; onEvent?: (e: unknown) => void }>();

  const failAll = () => {
    broken = true;
    pending.forEach((p) => p.reject(new WorkerUnavailableError("Assistant worker stopped.")));
    pending.clear();
    worker.terminate();
  };

  worker.addEventListener("message", (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    const entry = pending.get(msg.id);
    if (!entry) return;
    if ("event" in msg) {
      entry.onEvent?.(msg.event);
      return;
    }
    pending.delete(msg.id);
    if (msg.ok) entry.resolve(msg.result);
    else entry.reject(new Error(msg.error));
  });
  worker.addEventListener("error", failAll);
  worker.addEventListener("messageerror", failAll);

  return {
    kind: "worker",
    call<T>(method: CoreMethod, args: unknown[], onEvent?: (event: unknown) => void) {
      if (broken) return Promise.reject(new WorkerUnavailableError("Assistant worker stopped."));
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onEvent });
        worker.postMessage({ id, method, args } satisfies WorkerRequest);
      });
    },
    dispose() {
      failAll();
    },
  };
}

/** Uses the worker until it fails, then falls back to running in-thread. */
function createBackend(preference: "auto" | "worker" | "inline"): Backend {
  let active: Backend = (preference !== "inline" && createWorkerBackend()) || createInlineBackend();
  return {
    get kind() {
      return active.kind;
    },
    async call<T>(method: CoreMethod, args: unknown[], onEvent?: (event: unknown) => void) {
      try {
        return await active.call<T>(method, args, onEvent);
      } catch (err) {
        if (!(err instanceof WorkerUnavailableError) || preference === "worker") throw err;
        active = createInlineBackend();
        return active.call<T>(method, args, onEvent);
      }
    },
    dispose() {
      active.dispose();
    },
  };
}

export interface AssistantOptions {
  backend?: "auto" | "worker" | "inline";
  /** Mirror tour events onto `window` as TOUR_WINDOW_EVENT. Defaults to true in browsers. */
  windowEvents?: boolean;
  /** Decides at tour start which stops exist on the current page. */
  isTourStopAvailable?: (targetId: string) => boolean;
  /**
   * Endpoint that words grounded answers with the site's own model
   * (api/chat). Defaults to "/api/chat" in browsers; false turns it off.
   * Ignored while a visitor's own provider is connected.
   */
  siteGeneration?: string | false;
}

export interface SkillEvidence {
  skillId: string;
  label: string;
  status: MatchStatus;
  evidence: MatchEvidence[];
}

export interface Assistant {
  /** Retrieve locally, then answer offline or with the connected provider. */
  ask(query: string, options?: AskOptions & { signal?: AbortSignal }): Promise<AskResult>;
  search(query: string, topK?: number): Promise<SearchResult>;
  matchJob(text: string): Promise<JobMatchResult>;
  skillEvidence(skill: string): Promise<SkillEvidence | null>;
  looksLikeJobDescription(text: string): boolean;
  pitch(audience: Pitch["audience"]): Pitch;
  readonly audiences: { id: Pitch["audience"]; label: string }[];
  readonly tour: Tour;
  readonly tools: {
    schemas(): Promise<ToolSchema[]>;
    run(name: string, args?: Record<string, unknown>): Promise<unknown>;
  };
  runAgent(goal: string, onStep?: (step: AgentStep) => void): Promise<AgentRun>;
  /** Pass null to go back to offline answers. The key stays inside the provider closure. */
  setProvider(provider: LLMProvider | null): void;
  readonly provider: { label: string; model: string } | null;
  /** "idle" until the first call starts the worker. */
  readonly backendKind: "worker" | "inline" | "idle";
  dispose(): void;
}

const LLM_CONTEXT_SIZE = 4;

export function createAssistant(options: AssistantOptions = {}): Assistant {
  // Created on first use, so getAssistant() is cheap and the worker only
  // starts when someone actually asks something.
  let backendInstance: Backend | null = null;
  const backend = () => (backendInstance ??= createBackend(options.backend ?? "auto"));
  let provider: LLMProvider | null = null;
  let siteEndpoint: string | false = options.siteGeneration ?? (typeof window !== "undefined" ? "/api/chat" : false);

  const isAvailable = options.isTourStopAvailable ?? ((id: string) => typeof document === "undefined" || Boolean(document.getElementById(id)));
  const tour = createTour(buildTourStops(profile), { isAvailable: (stop) => isAvailable(stop.targetId) });

  if ((options.windowEvents ?? true) && typeof window !== "undefined") {
    (["start", "stop", "end"] as const).forEach((type) =>
      tour.on(type, (detail: TourEventDetail) => window.dispatchEvent(new CustomEvent(TOUR_WINDOW_EVENT, { detail })))
    );
  }

  /**
   * Asks the site's server to word a grounded answer. The server retrieves on
   * its own; the result is used only if it used exactly the facts retrieved
   * here and cites them. Any failure quietly keeps the offline answer.
   */
  async function generateOnSite(offline: AskResult, signal?: AbortSignal): Promise<AskResult> {
    if (!siteEndpoint || !offline.grounded) return offline;
    const hits = offline.retrieved.slice(0, LLM_CONTEXT_SIZE);
    const t0 = performance.now();
    try {
      const res = await fetch(siteEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: offline.query }),
        signal,
      });
      // Not deployed or not configured: stop asking for the rest of the visit.
      if (res.status === 404 || res.status === 405 || res.status === 503) siteEndpoint = false;
      if (!res.ok) return offline;
      const data = (await res.json()) as { ok?: boolean; answer?: string; model?: string; contextIds?: string[] };
      if (!data.ok || !data.answer || data.contextIds?.join("|") !== hits.map((h) => h.id).join("|")) return offline;
      const used = new Set([...data.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
      const citations: Citation[] = hits
        .map((h, i) => ({ n: i + 1, chunkId: h.id, sourceId: h.sourceId, title: h.title, section: h.section, anchor: h.anchor }))
        .filter((c) => used.has(c.n));
      if (!citations.length) return offline;
      return {
        ...offline,
        answer: data.answer,
        citations,
        generator: `Gemini · ${data.model ?? "server"}`,
        timings: { ...offline.timings, generationMs: performance.now() - t0 },
      };
    } catch {
      return offline;
    }
  }

  async function generate(offline: AskResult, signal?: AbortSignal): Promise<AskResult> {
    if (!provider || !offline.grounded) return offline;
    const hits = offline.retrieved.slice(0, LLM_CONTEXT_SIZE);
    const context = hits.map((h, i) => ({ n: i + 1, title: h.title, text: h.text }));
    const t0 = performance.now();
    try {
      const answer = await provider.generate({ question: offline.query, context, subjectName: profile.name, signal });
      const used = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
      const citations: Citation[] = hits
        .map((h, i) => ({ n: i + 1, chunkId: h.id, sourceId: h.sourceId, title: h.title, section: h.section, anchor: h.anchor }))
        .filter((c) => used.has(c.n));
      if (!citations.length) {
        return { ...offline, fallbackReason: "The live model didn't cite any sources, so this is the offline answer." };
      }
      return {
        ...offline,
        answer,
        citations,
        generator: `${provider.label} · ${provider.model}`,
        timings: { ...offline.timings, generationMs: performance.now() - t0 },
      };
    } catch (err) {
      return { ...offline, fallbackReason: `${(err as Error).message} Showing the offline answer.` };
    }
  }

  return {
    async ask(query, opts = {}) {
      const offline = await backend().call<AskResult>("ask", [query, { topK: opts.topK }]);
      return provider ? generate(offline, opts.signal) : generateOnSite(offline, opts.signal);
    },
    search: (query, topK) => backend().call("search", [query, topK]),
    matchJob: (text) => backend().call("matchJob", [text]),
    skillEvidence: (skill) => backend().call("skillEvidence", [skill]),
    looksLikeJobDescription,
    pitch: (audience) => buildPitch(profile, audience),
    audiences: AUDIENCES.map((id) => ({ id, label: profile.assistant.pitches[id].label })),
    tour,
    tools: {
      schemas: () => backend().call("toolSchemas", []),
      run: (name, args = {}) => backend().call("runTool", [name, args]),
    },
    runAgent: (goal, onStep) => backend().call("runAgent", [goal], onStep as (e: unknown) => void),
    setProvider(next) {
      provider = next;
    },
    get provider() {
      return provider ? { label: provider.label, model: provider.model } : null;
    },
    get backendKind() {
      return backendInstance?.kind ?? "idle";
    },
    dispose() {
      tour.end();
      backendInstance?.dispose();
      backendInstance = null;
      provider = null;
    },
  };
}

let shared: Assistant | null = null;

/** Lazily created app-wide instance; the worker starts on first use. */
export function getAssistant(): Assistant {
  return (shared ??= createAssistant());
}
