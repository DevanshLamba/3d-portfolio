import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { PitchAction } from "../../assistant";
import { profile } from "../../data/profile";
import type { AssistantChat, Mode } from "./useAssistant";
import { PALETTE_SHORTCUT } from "./shortcut";
import { EntryView, ProviderSettings } from "./Views";

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: "ask", label: "Ask", placeholder: `Ask about ${profile.firstName}'s work…` },
  { id: "agent", label: "Agent", placeholder: "Ask something multi-part; see each tool step…" },
  { id: "match", label: "Job match", placeholder: "Paste a job description…" },
];

const SUGGESTIONS = ["What is Siliqo?", "Where did he study?", "What has he built with React Native?", "How can I contact him?"];

interface PanelProps {
  id: string;
  chat: AssistantChat;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  /** Changes whenever something outside asks the input to take focus. */
  focusKey: number;
  onClose: () => void;
  onAction: (action: PitchAction) => void;
  onStartTour: () => void;
  onOpenLab: () => void;
  onOpenPalette: () => void;
}

const Panel = ({ id, chat, mode, onModeChange, focusKey, onClose, onAction, onStartTour, onOpenLab, onOpenPalette }: PanelProps) => {
  const { assistant, entries, busy, send, pitch, connect, disconnect, provider, clear } = chat;
  const [input, setInput] = useState("");
  const [showAudiences, setShowAudiences] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries, busy]);

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
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <section id={id} className="assistant-panel" aria-label={`Ask about ${profile.firstName}`}>
      <span className="assistant-tab" aria-hidden="true">
        Case file · DL-{String(entries.length + 1).padStart(4, "0")}
      </span>
      <header className="assistant-header">
        <div>
          <span className="assistant-label">Archive terminal</span>
          <h2>Ask about {profile.firstName}</h2>
        </div>
        <button type="button" className="assistant-icon" onClick={onClose} aria-label="Close assistant">
          ×
        </button>
      </header>

      <div className="assistant-row" role="group" aria-label="Shortcuts">
        <button type="button" className="assistant-btn" aria-expanded={showAudiences} onClick={() => setShowAudiences((s) => !s)}>
          Pitch me
        </button>
        <button type="button" className="assistant-btn" onClick={onStartTour}>
          Tour
        </button>
        <button type="button" className="assistant-btn" onClick={onOpenLab}>
          Lab
        </button>
        <button type="button" className="assistant-btn" onClick={onOpenPalette} title={`Command palette (${PALETTE_SHORTCUT})`}>
          {PALETTE_SHORTCUT}
        </button>
        {entries.length > 0 && (
          <button type="button" className="assistant-btn is-quiet" onClick={clear}>
            Clear
          </button>
        )}
      </div>
      {showAudiences && (
        <div className="assistant-row" role="group" aria-label="Who's visiting?">
          {assistant.audiences.map((a) => (
            <button
              type="button"
              className="assistant-btn is-soft"
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
          <div className="assistant-empty">
            <p className="assistant-note">Answers come only from this site's content, with sources. Everything runs in your browser.</p>
            <div className="assistant-row">
              {SUGGESTIONS.map((q) => (
                <button type="button" key={q} className="assistant-btn is-soft" onClick={() => send(q, "ask")}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {entries.map((entry) => (
          <EntryView key={entry.id} entry={entry} onAction={onAction} />
        ))}
        {busy && <p className="assistant-note assistant-working">Searching the archive…</p>}
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <div className="assistant-modes" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <label key={m.id} className={mode === m.id ? "is-active" : undefined}>
              <input type="radio" name={`${id}-mode`} checked={mode === m.id} onChange={() => onModeChange(m.id)} />
              {m.label}
            </label>
          ))}
        </div>
        <div className="assistant-input">
          <textarea
            ref={inputRef}
            value={input}
            rows={mode === "match" ? 6 : 2}
            placeholder={current.placeholder}
            aria-label={current.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="assistant-btn is-primary" disabled={busy || !input.trim()}>
            {mode === "match" ? "Match" : "Send"}
          </button>
        </div>
      </form>

      <ProviderSettings provider={provider} onConnect={connect} onDisconnect={disconnect} />
    </section>
  );
};

export default Panel;
