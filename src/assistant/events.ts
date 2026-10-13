// Window event names shared by the assistant and the page. Kept in their own
// module so listeners (like the 3D scene) don't pull in the assistant itself.

/** Mirrors every tour event; detail is a TourEventDetail. */
export const TOUR_WINDOW_EVENT = "portfolio:tour";

/** What the assistant is doing; detail is { state: AssistantActivity }. */
export const ASSISTANT_STATE_EVENT = "portfolio:assistant";

export type AssistantActivity = "idle" | "thinking" | "answering";
