import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPresetProvider,
  getAssistant,
  type AgentStep,
  type AskResult,
  type JobMatchResult,
  type Pitch,
  type ProviderPreset,
} from "../../assistant";

export type Mode = "ask" | "agent" | "match";

export type Entry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "answer"; result: AskResult }
  | { id: number; kind: "match"; result: JobMatchResult }
  | { id: number; kind: "pitch"; pitch: Pitch }
  | { id: number; kind: "agent"; steps: AgentStep[]; done: boolean }
  | { id: number; kind: "note"; text: string };

type NewEntry = Entry extends infer E ? (E extends Entry ? Omit<E, "id"> : never) : never;

/** Chat state around the shared assistant. Creating it starts the worker. */
export function useAssistant() {
  const assistant = useMemo(() => getAssistant(), []);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [provider, setProviderInfo] = useState(assistant.provider);
  const nextId = useRef(1);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const push = useCallback((entry: NewEntry) => {
    const id = nextId.current++;
    setEntries((list) => [...list, { ...entry, id } as Entry]);
    return id;
  }, []);

  const send = useCallback(
    async (text: string, mode: Mode) => {
      const input = text.trim();
      if (!input || busy) return;
      push({ kind: "user", text: input });
      setBusy(true);
      try {
        if (mode === "match" || (mode === "ask" && assistant.looksLikeJobDescription(input))) {
          push({ kind: "match", result: await assistant.matchJob(input) });
        } else if (mode === "agent") {
          const id = push({ kind: "agent", steps: [], done: false });
          const addStep = (step: AgentStep) =>
            setEntries((list) => list.map((e) => (e.id === id && e.kind === "agent" ? { ...e, steps: [...e.steps, step] } : e)));
          await assistant.runAgent(input, addStep);
          setEntries((list) => list.map((e) => (e.id === id && e.kind === "agent" ? { ...e, done: true } : e)));
        } else {
          inFlight.current = new AbortController();
          push({ kind: "answer", result: await assistant.ask(input, { signal: inFlight.current.signal }) });
        }
      } catch (err) {
        push({ kind: "note", text: `Something went wrong: ${(err as Error).message}` });
      } finally {
        inFlight.current = null;
        setBusy(false);
      }
    },
    [assistant, busy, push]
  );

  const pitch = useCallback((audience: Pitch["audience"]) => push({ kind: "pitch", pitch: assistant.pitch(audience) }), [assistant, push]);

  const connect = useCallback(
    (preset: ProviderPreset, apiKey: string, model?: string) => {
      assistant.setProvider(createPresetProvider(preset, apiKey, model));
      setProviderInfo(assistant.provider);
    },
    [assistant]
  );

  const disconnect = useCallback(() => {
    assistant.setProvider(null);
    setProviderInfo(null);
  }, [assistant]);

  const clear = useCallback(() => setEntries([]), []);

  return { assistant, entries, busy, send, pitch, connect, disconnect, provider, clear };
}
