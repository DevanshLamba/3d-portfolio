// The assistant's engine: knowledge, index, matcher and tools built once from
// the profile. Synchronous and DOM-free, so it runs the same inside a Web
// Worker, on the main thread, or under Node for tests.

import { profile as defaultProfile, type ProfileData } from "../data/profile.ts";
import { runAgent } from "./agent.ts";
import { composeAnswer, type ComposeContext } from "./answer.ts";
import { buildKnowledge } from "./knowledge.ts";
import { TfIdfIndex } from "./retrieval.ts";
import { createJobMatcher } from "./skills/jobMatcher.ts";
import { runTool, toolSchemas, type ToolContext } from "./tools.ts";
import type { AgentStep, AskResult } from "./types.ts";

export interface AskOptions {
  topK?: number;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function createAssistantCore(p: ProfileData = defaultProfile) {
  const chunks = buildKnowledge(p);
  const index = new TfIdfIndex(chunks, [p.name, p.firstName]);
  const matcher = createJobMatcher(p);
  const toolCtx: ToolContext = { profile: p, index, matcher };
  const composeCtx: ComposeContext = {
    firstName: p.firstName,
    suggestions: [...p.projects.map((proj) => proj.title), "his skills", "education", "how to get in touch"],
  };

  return {
    chunks,
    stats: () => ({ chunks: chunks.length, vocabulary: index.idf.size }),

    ask(query: string, options: AskOptions = {}): AskResult {
      const t0 = now();
      const result = index.search(query, { topK: options.topK ?? 5 });
      const t1 = now();
      const composed = composeAnswer(query, result, composeCtx);
      return {
        query,
        answer: composed.answer,
        citations: composed.citations,
        retrieved: result.hits,
        queryTerms: result.queryTerms,
        unknownTerms: result.unknownTerms,
        grounded: composed.grounded,
        outcome: composed.outcome,
        generator: "offline",
        timings: { retrievalMs: t1 - t0, generationMs: now() - t1 },
      };
    },

    search: (query: string, topK = 5) => index.search(query, { topK }),
    matchJob: (text: string) => matcher.match(text),
    skillEvidence: (skill: string) => matcher.evidenceFor(skill),
    toolSchemas,
    runTool: (name: string, args: Record<string, unknown> = {}) => runTool(name, args, toolCtx),
    runAgent: (goal: string, onStep?: (step: AgentStep) => void) => runAgent(goal, toolCtx, { onStep }),
  };
}

export type AssistantCore = ReturnType<typeof createAssistantCore>;

export type CoreMethod = "ask" | "search" | "matchJob" | "skillEvidence" | "toolSchemas" | "runTool" | "runAgent" | "stats";

/** One entry point for every transport (worker messages or direct calls). */
export function dispatch(core: AssistantCore, method: CoreMethod, args: unknown[], onEvent?: (event: unknown) => void): unknown {
  switch (method) {
    case "ask":
      return core.ask(args[0] as string, args[1] as AskOptions | undefined);
    case "search":
      return core.search(args[0] as string, args[1] as number | undefined);
    case "matchJob":
      return core.matchJob(args[0] as string);
    case "skillEvidence":
      return core.skillEvidence(args[0] as string);
    case "toolSchemas":
      return core.toolSchemas();
    case "runTool":
      return core.runTool(args[0] as string, args[1] as Record<string, unknown> | undefined);
    case "runAgent":
      return core.runAgent(args[0] as string, onEvent);
    case "stats":
      return core.stats();
    default:
      throw new Error(`Unknown method "${String(method)}".`);
  }
}
