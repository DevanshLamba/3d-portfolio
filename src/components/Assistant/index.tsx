import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { PROVIDER_PRESETS, type AskResult, type JobMatchResult, type MatchStatus, type Pitch, type PitchAction, type ProviderPreset } from "../../assistant";
import { profile } from "../../data/profile";
import { navigateToSection } from "./sceneNavigation";
import { useAssistant, type Entry, type Mode } from "./useAssistant";
import { useSceneTour } from "./useSceneTour";
import "./Assistant.css";

// A thin, mostly unstyled mount for the assistant. Everything visual lives in
// Assistant.css under .assistant-* classes; replace either freely. The logic
// is in useAssistant/useSceneTour and src/assistant.

const STATUS_LABELS: Record<MatchStatus, string> = {
  shipped: "Shipped",
  core: "Core",
  listed: "Listed",
  transferable: "Transferable",
  gap: "Gap",
};

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: "ask", label: "Ask", placeholder: `Ask about ${profile.firstName}'s work…` },
  { id: "agent", label: "Agent", placeholder: "Ask something multi-part; see each tool step…" },
  { id: "match", label: "Job match", placeholder: "Paste a job description…" },
];

const Assistant = () => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="assistant-root">
      {open && <AssistantPanel id={panelId} onClose={() => setOpen(false)} />}
      <button
        type="button"
        className="assistant-launcher"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : `Ask about ${profile.firstName}`}
      </button>
    </div>
  );
};

export default Assistant;

const AssistantPanel = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { assistant, entries, busy, send, pitch, connect, disconnect, provider, clear } = useAssistant();
  const tourState = useSceneTour(assistant.tour);
  const [mode, setMode] = useState<Mode>("ask");
  const [input, setInput] = useState("");
  const [showAudiences, setShowAudiences] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const tour = assistant.tour;
    return () => tour.end();
  }, [assistant]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    send(input, mode);
    setInput("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && mode !== "match") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape" && !tourState) {
      onClose();
    }
  };

  const runAction = (action: PitchAction) => {
    if (action.anchor) navigateToSection(action.anchor);
    if (action.skill === "tour") assistant.tour.start();
    if (action.skill === "match") {
      setMode("match");
      inputRef.current?.focus();
    }
  };

  if (tourState?.stop) {
    const { stop, index, total } = tourState;
    return (
      <section id={id} className="assistant-panel assistant-tour" aria-label="Guided tour">
        <p className="assistant-tour-progress">
          Stop {index + 1} of {total}: {stop.title}
        </p>
        <p aria-live="polite">{stop.narration}</p>
        <div className="assistant-row">
          <button type="button" onClick={() => assistant.tour.prev()} disabled={index === 0}>
            Back
          </button>
          <button type="button" onClick={() => assistant.tour.next()}>
            {index === total - 1 ? "Finish" : "Next"}
          </button>
          <button type="button" onClick={() => assistant.tour.end()}>
            End tour
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="assistant-panel" aria-label={`Ask about ${profile.firstName}`}>
      <header className="assistant-header">
        <h2>Ask about {profile.firstName}</h2>
        <button type="button" onClick={onClose} aria-label="Close assistant">
          ×
        </button>
      </header>

      <div className="assistant-row" role="group" aria-label="Shortcuts">
        <button type="button" aria-expanded={showAudiences} onClick={() => setShowAudiences((s) => !s)}>
          Pitch me
        </button>
        <button type="button" onClick={() => assistant.tour.start()}>
          Take the tour
        </button>
        {entries.length > 0 && (
          <button type="button" onClick={clear}>
            Clear
          </button>
        )}
      </div>
      {showAudiences && (
        <div className="assistant-row" role="group" aria-label="Who's visiting?">
          {assistant.audiences.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => {
                pitch(a.id);
                setShowAudiences(false);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className="assistant-log" ref={logRef} aria-live="polite">
        {entries.length === 0 && (
          <p className="assistant-note">
            Answers come only from this site's content, with sources. Everything runs in your browser.
          </p>
        )}
        {entries.map((entry) => (
          <EntryView key={entry.id} entry={entry} onAction={runAction} />
        ))}
        {busy && <p className="assistant-note">Thinking…</p>}
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <div className="assistant-row" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <label key={m.id}>
              <input type="radio" name={`${id}-mode`} checked={mode === m.id} onChange={() => setMode(m.id)} /> {m.label}
            </label>
          ))}
        </div>
        <textarea
          ref={inputRef}
          value={input}
          rows={mode === "match" ? 6 : 2}
          placeholder={MODES.find((m) => m.id === mode)?.placeholder}
          aria-label={MODES.find((m) => m.id === mode)?.placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {mode === "match" ? "Match" : "Send"}
        </button>
      </form>

      <ProviderSettings provider={provider} onConnect={connect} onDisconnect={disconnect} />
    </section>
  );
};

const EntryView = ({ entry, onAction }: { entry: Entry; onAction: (a: PitchAction) => void }) => {
  switch (entry.kind) {
    case "user":
      return <p className="assistant-msg assistant-msg-user">{entry.text}</p>;
    case "note":
      return <p className="assistant-note">{entry.text}</p>;
    case "answer":
      return <AnswerView result={entry.result} />;
    case "match":
      return <MatchView result={entry.result} />;
    case "pitch":
      return <PitchView pitch={entry.pitch} onAction={onAction} />;
    case "agent":
      return (
        <div className="assistant-msg">
          <ol className="assistant-steps">
            {entry.steps.map((step, i) => (
              <li key={i} data-kind={step.kind}>
                <strong>{step.kind}</strong> <span className="assistant-pre">{step.text}</span>
                {step.output !== undefined && (
                  <details>
                    <summary>Raw output</summary>
                    <pre>{JSON.stringify(step.output, null, 2)}</pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
          {!entry.done && <p className="assistant-note">Working…</p>}
        </div>
      );
  }
};

const AnswerView = ({ result }: { result: AskResult }) => (
  <div className="assistant-msg">
    <p className="assistant-pre">{result.answer}</p>
    {result.fallbackReason && <p className="assistant-note">{result.fallbackReason}</p>}
    {result.citations.length > 0 && (
      <ol className="assistant-citations" aria-label="Sources">
        {result.citations.map(({ n, anchor, title }) => (
          <li key={n} value={n}>
            {anchor ? (
              <a
                href={`#${anchor}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToSection(anchor);
                }}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </li>
        ))}
      </ol>
    )}
    {result.retrieved.length > 0 && (
      <details>
        <summary>
          How this was found ({result.retrieved.length} facts, {result.timings.retrievalMs.toFixed(1)} ms, {result.generator})
        </summary>
        <ol>
          {result.retrieved.map((h) => (
            <li key={h.id}>
              {h.title}: score {h.score.toFixed(3)} (cosine {h.signals.cosine.toFixed(2)}, coverage {h.signals.coverage.toFixed(2)}, tags{" "}
              {h.signals.tagMatch.toFixed(2)}, phrase {h.signals.phrase.toFixed(2)})
            </li>
          ))}
        </ol>
      </details>
    )}
  </div>
);

const MatchView = ({ result }: { result: JobMatchResult }) => (
  <div className="assistant-msg">
    <p>
      <strong>{result.verdict}</strong>
      {result.rows.length > 0 && ` · ${result.score}/100`}
    </p>
    <p>{result.summary}</p>
    {result.notes.map((n) => (
      <p className="assistant-note" key={n}>
        {n}
      </p>
    ))}
    {result.rows.length > 0 && (
      <table className="assistant-match">
        <thead>
          <tr>
            <th scope="col">Skill</th>
            <th scope="col">Status</th>
            <th scope="col">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr key={r.skillId} data-status={r.status}>
              <td>
                {r.label}
                {!r.required && " (nice to have)"}
              </td>
              <td>{STATUS_LABELS[r.status]}</td>
              <td>{r.evidence.length ? r.evidence.map((e) => `${e.title}: ${e.quote}`).join(" · ") : "None in the portfolio"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const PitchView = ({ pitch, onAction }: { pitch: Pitch; onAction: (a: PitchAction) => void }) => (
  <div className="assistant-msg">
    <p>
      <strong>{pitch.label}:</strong> {pitch.text}
    </p>
    {pitch.points.length > 0 && (
      <ul>
        {pitch.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    )}
    <div className="assistant-row">
      {pitch.actions.map((a) =>
        a.href ? (
          <a key={a.label} href={a.href} target="_blank" rel="noreferrer">
            {a.label}
          </a>
        ) : (
          <button type="button" key={a.label} onClick={() => onAction(a)}>
            {a.label}
          </button>
        )
      )}
    </div>
  </div>
);

const ProviderSettings = ({
  provider,
  onConnect,
  onDisconnect,
}: {
  provider: { label: string; model: string } | null;
  onConnect: (preset: ProviderPreset, key: string, model?: string) => void;
  onDisconnect: () => void;
}) => {
  const [preset, setPreset] = useState<ProviderPreset>("groq");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      onConnect(preset, key, model);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      // Don't keep the key in component state once it's in the provider.
      setKey("");
    }
  };

  return (
    <details className="assistant-settings">
      <summary>Live model (optional){provider ? `: ${provider.label}` : ""}</summary>
      {provider ? (
        <p>
          Using {provider.label} ({provider.model}) to write answers from the retrieved facts.{" "}
          <button type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="assistant-note">
            Retrieval always runs in your browser. With a key, only the wording step goes to the provider you pick. The key stays in this
            tab's memory and is never saved.
          </p>
          <label>
            Provider{" "}
            <select value={preset} onChange={(e) => setPreset(e.target.value as ProviderPreset)}>
              {(Object.keys(PROVIDER_PRESETS) as ProviderPreset[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_PRESETS[p].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model{" "}
            <input value={model} placeholder={PROVIDER_PRESETS[preset].defaultModel} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label>
            API key{" "}
            <input type="password" autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <button type="submit" disabled={!key.trim()}>
            Connect
          </button>
          {error && <p className="assistant-note">{error}</p>}
        </form>
      )}
    </details>
  );
};
