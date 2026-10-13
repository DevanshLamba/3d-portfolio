import { useMemo, useState } from "react";
import { buildPlaygroundIndex, chunkText, queryPlayground, SAMPLE_TEXT } from "../../../lab/ragPlayground";

const RagPlayground = () => {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [size, setSize] = useState(220);
  const [overlap, setOverlap] = useState(40);
  const [query, setQuery] = useState("why does overlap matter?");

  const chunks = useMemo(() => chunkText(text, size, Math.min(overlap, size - 20)), [text, size, overlap]);
  const index = useMemo(() => buildPlaygroundIndex(chunks), [chunks]);
  const search = useMemo(() => (query.trim() ? queryPlayground(index, query, 4) : null), [index, query]);
  const rank = new Map(search?.result.hits.map((h, i) => [h.id, i + 1]) ?? []);

  return (
    <div className="lab-demo lab-demo-wide">
      <div className="lab-controls">
        <label>
          Your text
          <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        </label>
        <label>
          Chunk size {size} chars
          <input type="range" min={80} max={600} step={20} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <label>
          Overlap {overlap} chars
          <input type="range" min={0} max={150} step={10} value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} />
        </label>
        <label>
          Question
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask your text something…" />
        </label>
        <dl className="lab-stats">
          <dt>Chunks</dt>
          <dd>{chunks.length}</dd>
          <dt>Vocabulary</dt>
          <dd>{index.idf.size} terms</dd>
          <dt>Query terms</dt>
          <dd>{search?.result.queryTerms.join(", ") || "–"}</dd>
          <dt>Answerable</dt>
          <dd className={search?.relevant ? "is-good" : "is-bad"}>{search ? (search.relevant ? "yes" : "no: nothing relevant") : "–"}</dd>
        </dl>
      </div>

      <div className="lab-scroll">
        <h4 className="lab-subhead">Top matches</h4>
        <ol className="lab-results">
          {search?.result.hits.map((h) => (
            <li key={h.id}>
              <strong>{h.title}</strong> · score {h.score.toFixed(3)}
              <small>
                cosine {h.signals.cosine.toFixed(2)} · coverage {h.signals.coverage.toFixed(2)} · phrase {h.signals.phrase.toFixed(2)}
                {h.matchedTerms.length > 0 && ` · matched: ${h.matchedTerms.join(", ")}`}
              </small>
            </li>
          ))}
          {search && search.result.hits.length === 0 && <li>No chunk shares a term with the question.</li>}
        </ol>

        <h4 className="lab-subhead">Chunks (overlap highlighted)</h4>
        <ol className="lab-chunks">
          {chunks.map((c) => {
            const r = rank.get(`chunk:${c.index}`);
            return (
              <li key={c.index} className={r === 1 ? "is-top" : r ? "is-hit" : undefined}>
                <span className="lab-chunk-head">
                  Chunk {c.index + 1} · {c.text.length} chars{r ? ` · rank ${r}` : ""}
                </span>
                <p>
                  {c.overlapChars > 0 && <mark>{c.text.slice(0, c.overlapChars)}</mark>}
                  {c.text.slice(c.overlapChars)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default RagPlayground;
