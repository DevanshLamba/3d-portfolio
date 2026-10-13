import type { Tour, TourEventDetail } from "../../assistant";
import { openResponseForm } from "../ResponseForm/openResponseForm";

const TourCard = ({ tour, state }: { tour: Tour; state: TourEventDetail }) => {
  if (!state.stop) return null;
  const { stop, index, total } = state;
  return (
    <section className="assistant-panel assistant-tour" aria-label="Guided tour">
      <span className="assistant-tab" aria-hidden="true">
        Guided tour · stop {index + 1}/{total}
      </span>
      <span className="assistant-label">{stop.title}</span>
      <p aria-live="polite">{stop.narration}</p>
      <div className="assistant-progress" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i <= index ? "is-done" : undefined} />
        ))}
      </div>
      <div className="assistant-row">
        <button type="button" className="assistant-btn" onClick={() => tour.prev()} disabled={index === 0}>
          ← Back
        </button>
        <button type="button" className="assistant-btn is-primary" onClick={() => tour.next()}>
          {index === total - 1 ? "Finish" : "Next →"}
        </button>
        {index === total - 1 && (
          <button
            type="button"
            className="assistant-btn"
            onClick={() => {
              tour.end();
              openResponseForm();
            }}
          >
            Leave a response
          </button>
        )}
        <button type="button" className="assistant-btn is-quiet" onClick={() => tour.end()}>
          End (Esc)
        </button>
      </div>
    </section>
  );
};

export default TourCard;
