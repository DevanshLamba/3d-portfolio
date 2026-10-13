// Shared shapes for the assistant. Everything here is plain data so it can
// cross the Web Worker boundary through structured cloning.

export type Section =
  | "profile"
  | "about"
  | "services"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "certifications"
  | "achievements"
  | "contact";

/** One small, self-contained fact the retriever can return and cite. */
export interface Chunk {
  id: string;
  /** The profile entity this fact came from, e.g. "project:siliqo". */
  sourceId: string;
  section: Section;
  title: string;
  text: string;
  tags: string[];
  /** DOM id of the page section that shows this fact, for "jump to" links. */
  anchor?: string;
  /** Prior applied during rerank; 1 is neutral. */
  weight?: number;
}

export interface RerankSignals {
  cosine: number;
  coverage: number;
  tagMatch: number;
  phrase: number;
  titleMatch: number;
}

export interface RetrievedChunk {
  id: string;
  sourceId: string;
  section: Section;
  title: string;
  text: string;
  anchor?: string;
  score: number;
  signals: RerankSignals;
  matchedTerms: string[];
}

export interface Citation {
  /** The [n] marker used in the answer text. */
  n: number;
  chunkId: string;
  sourceId: string;
  title: string;
  section: Section;
  anchor?: string;
}

/** answered: cited facts · not-found: honest "couldn't find" · chat: greeting or help. */
export type AnswerOutcome = "answered" | "not-found" | "chat";

export interface AskResult {
  query: string;
  answer: string;
  citations: Citation[];
  retrieved: RetrievedChunk[];
  /** Stemmed content terms from the question, and those the corpus has never seen. */
  queryTerms: string[];
  unknownTerms: string[];
  /** False when nothing relevant was found and the answer says so. */
  grounded: boolean;
  outcome: AnswerOutcome;
  generator: "offline" | string;
  /** Set when a live provider failed and the offline answer was used instead. */
  fallbackReason?: string;
  timings: { retrievalMs: number; generationMs: number };
}

export type MatchStatus = "shipped" | "core" | "listed" | "transferable" | "gap";

export interface MatchEvidence {
  kind: "project" | "experience" | "skill" | "service" | "certification" | "achievement" | "related";
  sourceId: string;
  title: string;
  quote: string;
  anchor?: string;
}

export interface JobMatchRow {
  skillId: string;
  label: string;
  family: string;
  required: boolean;
  status: MatchStatus;
  evidence: MatchEvidence[];
}

export interface JobMatchResult {
  score: number;
  verdict: string;
  summary: string;
  rows: JobMatchRow[];
  counts: Record<MatchStatus, number>;
  notes: string[];
}

export type AgentStepKind = "plan" | "act" | "observe" | "answer";

export interface AgentStep {
  kind: AgentStepKind;
  text: string;
  tool?: string;
  args?: Record<string, unknown>;
  output?: unknown;
}

export interface AgentRun {
  goal: string;
  steps: AgentStep[];
  answer: string;
}

export interface JsonSchema {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface ToolSchema {
  type: "function";
  function: { name: string; description: string; parameters: JsonSchema };
}
