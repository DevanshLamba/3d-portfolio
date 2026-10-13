// Web Worker host. Building the index and scoring queries happens here so the
// render loop on the main thread never waits on the assistant.

import { createAssistantCore, dispatch, type CoreMethod } from "./core.ts";

export interface WorkerRequest {
  id: number;
  method: CoreMethod;
  args: unknown[];
}

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string }
  | { id: number; event: unknown };

// The app's tsconfig targets the DOM lib, so describe the worker scope locally.
const scope = self as unknown as {
  postMessage(message: WorkerResponse): void;
  addEventListener(type: "message", listener: (e: MessageEvent<WorkerRequest>) => void): void;
};

const core = createAssistantCore();

scope.addEventListener("message", (e) => {
  const { id, method, args } = e.data;
  try {
    const result = dispatch(core, method, args, (event) => scope.postMessage({ id, event }));
    scope.postMessage({ id, ok: true, result });
  } catch (err) {
    scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
