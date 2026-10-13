import { useEffect, useRef } from "react";
import Attention from "./Attention";
import KMeans from "./KMeans";
import NeuralNet from "./NeuralNet";
import RagPlayground from "./RagPlayground";
import Regression from "./Regression";
import { LAB_TABS, type LabTab } from "./tabs";
import "./Lab.css";

const DEMOS: Record<LabTab, () => JSX.Element> = {
  neural: NeuralNet,
  rag: RagPlayground,
  attention: Attention,
  kmeans: KMeans,
  regression: Regression,
};

interface Props {
  tab: LabTab;
  onTabChange: (tab: LabTab) => void;
  onClose: () => void;
}

/** The Lab: from-scratch ML demos on a CRT-style screen. Esc closes it. */
const Lab = ({ tab, onTabChange, onClose }: Props) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const Demo = DEMOS[tab];
  const info = LAB_TABS.find((t) => t.id === tab)!;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lab-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="lab" role="dialog" aria-modal="true" aria-label={`Lab: ${info.label}`}>
        <header className="lab-header">
          <span className="lab-badge">Lab · terminal 03</span>
          <div className="lab-tabs" role="tablist" aria-label="Demos">
            {LAB_TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={t.id === tab ? "is-active" : undefined} onClick={() => onTabChange(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <button ref={closeRef} type="button" className="lab-close" onClick={onClose} aria-label="Close the lab">
            ×
          </button>
        </header>
        <div className="lab-screen" role="tabpanel" aria-label={info.label}>
          <p className="lab-blurb">› {info.blurb}</p>
          <Demo key={tab} />
        </div>
        <footer className="lab-foot">Everything here runs in your browser, written from scratch with no ML libraries. Esc to close.</footer>
      </section>
    </div>
  );
};

export default Lab;
