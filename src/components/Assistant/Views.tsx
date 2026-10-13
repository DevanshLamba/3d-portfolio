import { FormEvent, useState } from "react";
import {
  PROVIDER_PRESETS,
  type AgentStep,
  type AskResult,
  type JobMatchResult,
  type MatchStatus,
  type Pitch,
  type PitchAction,
  type ProviderPreset,
} from "../../assistant";
import { openResponseForm } from "../ResponseForm/openResponseForm";
import { navigateToSection } from "./sceneNavigation";
import type { Entry } from "./useAssistant";

const STATUS_LABELS: Record<MatchStatus, string> = {
  shipped: "Shipped",
  core: "Core",
  listed: "Listed",
  transferable: "Transferable",
  gap: "Gap",
};

export const EntryView = ({ entry, onAction }: { entry: Entry; onAction: (a: PitchAction) => void }) => {
  switch (entry.kind) {
    case "user":
      return (
        <div className="assistant-card assistant-query">
          <span className="assistant-label">{entry.mode === "match" ? "Job description" : entry.mode === "agent" ? "Agent task" : "Query"}</span>
          <p className={entry.mode === "match" ? "assistant-jd" : undefined}>{entry.text}</p>
        </div>
      );
    case "note":
      return <p className="assistant-note">{entry.text}</p>;
    case "answer":
      return <AnswerView result={entry.result} />;
    case "match":
      return <MatchView result={entry.result} />;
    case "pitch":
      return <PitchView pitch={entry.pitch} onAction={onAction} />;
    case "agent":
      return <AgentView steps={entry.steps} done={entry.done} />;
  }
};

const Stamp = ({ ok, children }: { ok: boolean; children: string }) => (
  <span className={`assistant-stamp ${ok ? "is-ok" : "is-none"}`} aria-hidden="true">
    {children}
  </span>
);

const AnswerView = ({ result }: { result: AskResult }) => {
  const used = new Set(result.citations.map((c) => c.chunkId));
  const top = result.retrieved[0]?.score || 1;
  return (
    <div className="assistant-card assistant-answer">
      {result.outcome !== "chat" && <Stamp ok={result.grounded}>{result.grounded ? "Verified" : "No record"}</Stamp>}
      <p className="assistant-pre">{result.answer}</p>
      {result.fallbackReason && <p className="assistant-note">{result.fallbackReason}</p>}
      {result.actions.length > 0 && (
        <div className="assistant-row assistant-answer-actions">
          {result.actions.map((a) => (
            <button key={a.kind} type="button" className="assistant-btn is-primary" onClick={openResponseForm}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      {result.citations.length > 0 && (
        <div className="assistant-sources">
          <span className="assistant-label">Sources</span>
          <ol>
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
        </div>
      )}
      {(result.retrieved.length > 0 || result.queryTerms.length > 0) && (
        <details className="assistant-inspector">
          <summary>
            How this was found · {result.retrieved.length} facts · {result.timings.retrievalMs.toFixed(1)} ms · {result.generator}
          </summary>
          <p className="assistant-terms">
            <span className="assistant-label">Query terms</span>
            {result.queryTerms.length === 0 && <span className="assistant-note"> none (only stop words or the name)</span>}
            {result.queryTerms.map((t) => (
              <code key={t} className={result.unknownTerms.includes(t) ? "is-unknown" : undefined} title={result.unknownTerms.includes(t) ? "Not in the portfolio at all" : undefined}>
                {t}
              </code>
            ))}
          </p>
          <ol className="assistant-hits">
            {result.retrieved.map((h) => (
              <li key={h.id} className={used.has(h.id) ? "is-used" : "is-dropped"}>
                <div className="assistant-hit-head">
                  <strong>{h.title}</strong>
                  <span>{used.has(h.id) ? "used" : "dropped"}</span>
                </div>
                <div className="assistant-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(4, (h.score / top) * 100)}%` }} />
                </div>
                <small>
                  score {h.score.toFixed(3)} · cosine {h.signals.cosine.toFixed(2)} · coverage {h.signals.coverage.toFixed(2)} · tags{" "}
                  {h.signals.tagMatch.toFixed(2)} · phrase {h.signals.phrase.toFixed(2)} · title {h.signals.titleMatch.toFixed(2)}
                  {h.matchedTerms.length > 0 && ` · matched: ${h.matchedTerms.join(", ")}`}
                </small>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
};

const MatchView = ({ result }: { result: JobMatchResult }) => (
  <div className="assistant-card assistant-match-card">
    <Stamp ok={result.score >= 60}>{result.rows.length ? `${result.score}/100` : "No skills"}</Stamp>
    <p>
      <strong>{result.verdict}</strong>
    </p>
    <p>{result.summary}</p>
    {result.notes.map((n) => (
      <p className="assistant-note" key={n}>
        {n}
      </p>
    ))}
    {result.rows.length > 0 && (
      <>
        <p className="assistant-counts">
          {(Object.keys(STATUS_LABELS) as MatchStatus[]).map((s) => (
            <span key={s} className="assistant-chip" data-status={s}>
              {STATUS_LABELS[s]} {result.counts[s]}
            </span>
          ))}
        </p>
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
              <tr key={r.skillId}>
                <td>
                  {r.label}
                  {!r.required && <small> (nice to have)</small>}
                </td>
                <td>
                  <span className="assistant-chip" data-status={r.status}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td>{r.evidence.length ? r.evidence.map((e) => `${e.title}: ${e.quote}`).join(" · ") : "None in the portfolio"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}
  </div>
);

const PitchView = ({ pitch, onAction }: { pitch: Pitch; onAction: (a: PitchAction) => void }) => (
  <div className="assistant-card">
    <span className="assistant-label">Briefing · {pitch.label}</span>
    <p>{pitch.text}</p>
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
          <a key={a.label} className="assistant-btn" href={a.href} target="_blank" rel="noreferrer">
            {a.label}
          </a>
        ) : (
          <button type="button" className="assistant-btn" key={a.label} onClick={() => onAction(a)}>
            {a.label}
          </button>
        )
      )}
    </div>
  </div>
);

const AgentView = ({ steps, done }: { steps: AgentStep[]; done: boolean }) => (
  <div className="assistant-card">
    <span className="assistant-label">Agent log</span>
    <ol className="assistant-steps">
      {steps.map((step, i) => (
        <li key={i} data-kind={step.kind}>
          <strong>{step.kind}</strong> <span className="assistant-pre">{step.text}</span>
          {step.args && Object.keys(step.args).length > 0 && <code>{JSON.stringify(step.args)}</code>}
          {step.output !== undefined && (
            <details>
              <summary>Raw output</summary>
              <pre>{JSON.stringify(step.output, null, 2)}</pre>
            </details>
          )}
        </li>
      ))}
    </ol>
    {!done && <p className="assistant-note">Working…</p>}
  </div>
);

export const ProviderSettings = ({
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
          Using {provider.label} ({provider.model}) to word answers from the retrieved facts.{" "}
          <button type="button" className="assistant-btn" onClick={onDisconnect}>
            Disconnect
          </button>
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="assistant-note">
            By default the site's own server words answers with Gemini. Retrieval always runs in your browser. With your own key, only the
            wording step goes to the provider you pick instead. The key stays in this
            tab's memory and is never saved.
          </p>
          <label>
            Provider
            <select value={preset} onChange={(e) => setPreset(e.target.value as ProviderPreset)}>
              {(Object.keys(PROVIDER_PRESETS) as ProviderPreset[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_PRESETS[p].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input value={model} placeholder={PROVIDER_PRESETS[preset].defaultModel} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label>
            API key
            <input type="password" autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <button type="submit" className="assistant-btn" disabled={!key.trim()}>
            Connect
          </button>
          {error && <p className="assistant-note">{error}</p>}
        </form>
      )}
    </details>
  );
};
