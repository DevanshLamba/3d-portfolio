import { useMemo, useState } from "react";
import { MAX_TOKENS, selfAttention } from "../../../lab/attention";

const Attention = () => {
  const [sentence, setSentence] = useState("the agent read the ticket and the agent replied");
  const [headIndex, setHeadIndex] = useState(0);
  const [row, setRow] = useState(1);
  const result = useMemo(() => selfAttention(sentence), [sentence]);
  const head = result.heads[Math.min(headIndex, result.heads.length - 1)];
  const focus = Math.min(row, result.tokens.length - 1);

  return (
    <div className="lab-demo">
      <div className="lab-stage">
        {head ? (
          <table className="lab-heatmap" aria-label={`${head.name} head attention weights`}>
            <thead>
              <tr>
                <th scope="col" aria-label="Query token" />
                {result.tokens.map((t, j) => (
                  <th scope="col" key={j}>
                    <span>{t}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {head.weights.map((weights, i) => (
                <tr key={i} className={i === focus ? "is-focus" : undefined}>
                  <th scope="row">
                    <button type="button" onClick={() => setRow(i)} aria-pressed={i === focus}>
                      {result.tokens[i]}
                    </button>
                  </th>
                  {weights.map((w, j) => (
                    <td key={j} style={{ background: `rgba(240, 189, 130, ${Math.min(1, w * 1.6)})` }} title={`${result.tokens[i]} → ${result.tokens[j]}: ${w.toFixed(3)}`}>
                      {w >= 0.2 ? w.toFixed(2).slice(1) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="lab-note">Type a sentence to see attention.</p>
        )}
      </div>
      <div className="lab-controls">
        <label>
          Sentence (up to {MAX_TOKENS} words)
          <input value={sentence} onChange={(e) => setSentence(e.target.value)} />
        </label>
        <div className="lab-buttons" role="group" aria-label="Attention head">
          {result.heads.map((h, i) => (
            <button type="button" key={h.name} className={`lab-btn${i === headIndex ? " is-primary" : ""}`} aria-pressed={i === headIndex} onClick={() => setHeadIndex(i)}>
              {h.name}
            </button>
          ))}
        </div>
        {head && <p className="lab-note">{head.description}</p>}
        {head && result.tokens[focus] && (
          <div className="lab-bars">
            <span className="lab-subhead">“{result.tokens[focus]}” attends to (pick a row to change)</span>
            {head.weights[focus].map((w, j) => (
              <div key={j} className="lab-bar-row">
                <span>{result.tokens[j]}</span>
                <span className="lab-bar">
                  <span style={{ width: `${w * 100}%` }} />
                </span>
                <span>{w.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="lab-formula">Attention(Q, K, V) = softmax(QKᵀ / √d) · V, with d = {result.dModel}. Each row sums to 1.</p>
      </div>
    </div>
  );
};

export default Attention;
