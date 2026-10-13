// Public surface of the portfolio assistant.
//
//   const assistant = getAssistant();
//   await assistant.ask("What is Siliqo?")      // { answer, citations, retrieved, ... }
//   await assistant.matchJob(jobDescription)    // Shipped / Core / Listed / Transferable / Gap
//   assistant.pitch("recruiter")                // tailored summary + actions
//   assistant.tour.start(); assistant.tour.on("stop", ({ stop }) => ...)
//   assistant.setProvider(createPresetProvider("groq", pastedKey))

export { createAssistant, getAssistant, type Assistant, type AssistantOptions, type SkillEvidence } from "./client.ts";
export { ASSISTANT_STATE_EVENT, TOUR_WINDOW_EVENT, type AssistantActivity } from "./events.ts";
export { createOpenAICompatibleProvider, createPresetProvider, PROVIDER_PRESETS, ProviderError, type LLMProvider, type ProviderPreset } from "./llm.ts";
export type { Pitch, PitchAction } from "./skills/pitch.ts";
export type { Tour, TourEventDetail, TourStop } from "./skills/tour.ts";
export type * from "./types.ts";
