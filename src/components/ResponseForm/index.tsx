import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { LIMITS, validateResponse, type FieldErrors, type ResponseField } from "../../../api/contact";
import { navigateToSection } from "../Assistant/sceneNavigation";
import { RESPONSE_FORM_EVENT, RESPONSE_FORM_ID } from "./openResponseForm";
import "../styles/ResponseForm.css";

type Values = { name: string; email: string; organisation: string; role: string; message: string; consent: boolean };
type Status = "idle" | "sending" | "sent" | "failed";

const EMPTY: Values = { name: "", email: "", organisation: "", role: "", message: "", consent: false };
const ORDER: ResponseField[] = ["name", "email", "organisation", "role", "message", "consent"];
const LABELS: Record<ResponseField, string> = {
  name: "Name",
  email: "Email",
  organisation: "Organisation / company",
  role: "Role you're hiring for or reaching out about",
  message: "Message",
  consent: "Consent",
};

/**
 * Focuses once the element has scrolled into view. ScrollSmoother jumps to any
 * focused element that is off-screen, which would cut the scroll short.
 */
function focusWhenVisible(el: HTMLElement, timeoutMs = 4000) {
  const start = performance.now();
  const check = () => {
    const r = el.getBoundingClientRect();
    const visible = r.top >= 0 && r.bottom <= window.innerHeight;
    if (visible || performance.now() - start > timeoutMs) el.focus({ preventScroll: true });
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

/**
 * "Leave a response": visitors leave their details and get a reply by email.
 * Nothing is stored in the browser; on failure everything typed stays put.
 */
const ResponseForm = () => {
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showSummary, setShowSummary] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState("");
  const [sentTo, setSentTo] = useState({ name: "", email: "" });
  const shownAt = useRef(Date.now());
  const fieldRefs = useRef<Partial<Record<ResponseField, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const id = (field: ResponseField) => `${uid}-${field}`;
  const errorId = (field: ResponseField) => `${uid}-${field}-error`;

  useEffect(() => {
    const open = () => {
      navigateToSection(RESPONSE_FORM_ID);
      const target = status === "sent" ? doneRef.current : fieldRefs.current.name;
      if (target) focusWhenVisible(target);
    };
    window.addEventListener(RESPONSE_FORM_EVENT, open);
    return () => window.removeEventListener(RESPONSE_FORM_EVENT, open);
  }, [status]);

  const update = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field as ResponseField]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const focusFirst = (errs: FieldErrors) => {
    const first = ORDER.find((f) => errs[f]);
    if (first) fieldRefs.current[first]?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const checked = validateResponse(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      setShowSummary(true);
      setNotice("");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setErrors({});
    setShowSummary(false);
    setStatus("sending");
    setNotice("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: honeypot, elapsedMs: Date.now() - shownAt.current }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: FieldErrors };
      if (res.ok && body.ok) {
        setSentTo({ name: checked.value.name, email: checked.value.email });
        setValues(EMPTY);
        setStatus("sent");
        requestAnimationFrame(() => doneRef.current?.focus());
        return;
      }
      setStatus("failed");
      setNotice(body.error ?? "Your response couldn't be sent. Please try again.");
      if (body.fields) {
        setErrors(body.fields);
        focusFirst(body.fields);
      }
    } catch {
      setStatus("failed");
      setNotice("Couldn't reach the server. Check your connection and try again; your text is still here.");
    }
  };

  const errorCount = ORDER.filter((f) => errors[f]).length;
  const fieldProps = (field: ResponseField) => ({
    id: id(field),
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });
  const FieldError = ({ field }: { field: ResponseField }) =>
    errors[field] ? (
      <p className="respond-error" id={errorId(field)}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <section className="respond" id={RESPONSE_FORM_ID} aria-labelledby={`${uid}-title`} data-cursor="disable">
      <div className="respond-file">
        <span className="respond-tab" aria-hidden="true">
          Form DL-27 · Leave a response
        </span>
        <header className="respond-head">
          <h4 id={`${uid}-title`}>Leave a response</h4>
          <p>Recruiters and founders: leave your details and I&apos;ll get back to you by email.</p>
        </header>

        {status === "sent" ? (
          <div className="respond-done" ref={doneRef} tabIndex={-1} role="status">
            <span className="respond-stamp" aria-hidden="true">
              Received
            </span>
            <p>
              Thanks, {sentTo.name}. Your response is in, and I&apos;ll reply to <strong>{sentTo.email}</strong>.
            </p>
            <button
              type="button"
              className="respond-btn"
              onClick={() => {
                setStatus("idle");
                shownAt.current = Date.now();
                requestAnimationFrame(() => fieldRefs.current.name?.focus());
              }}
            >
              Send another response
            </button>
          </div>
        ) : (
          <form className="respond-form" onSubmit={submit} noValidate aria-busy={status === "sending"}>
            {showSummary && errorCount > 0 && (
              <div className="respond-summary" ref={summaryRef} tabIndex={-1} role="alert">
                <strong>
                  Please fix {errorCount} field{errorCount > 1 ? "s" : ""}:
                </strong>
                <ul>
                  {ORDER.filter((f) => errors[f]).map((f) => (
                    <li key={f}>
                      <a
                        href={`#${id(f)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          fieldRefs.current[f]?.focus();
                        }}
                      >
                        {LABELS[f]}: {errors[f]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="respond-grid">
              <div className="respond-field">
                <label htmlFor={id("name")}>
                  Name <span aria-hidden="true">*</span>
                </label>
                <input
                  {...fieldProps("name")}
                  ref={(el) => (fieldRefs.current.name = el)}
                  autoComplete="name"
                  required
                  maxLength={LIMITS.name}
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                <FieldError field="name" />
              </div>

              <div className="respond-field">
                <label htmlFor={id("email")}>
                  Email <span aria-hidden="true">*</span>
                </label>
                <input
                  {...fieldProps("email")}
                  ref={(el) => (fieldRefs.current.email = el)}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={LIMITS.email}
                  value={values.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                <FieldError field="email" />
              </div>

              <div className="respond-field">
                <label htmlFor={id("organisation")}>Organisation / company</label>
                <input
                  {...fieldProps("organisation")}
                  ref={(el) => (fieldRefs.current.organisation = el)}
                  autoComplete="organization"
                  maxLength={LIMITS.organisation}
                  value={values.organisation}
                  onChange={(e) => update("organisation", e.target.value)}
                />
                <FieldError field="organisation" />
              </div>

              <div className="respond-field">
                <label htmlFor={id("role")}>Role you&apos;re hiring for or reaching out about</label>
                <input
                  {...fieldProps("role")}
                  ref={(el) => (fieldRefs.current.role = el)}
                  maxLength={LIMITS.role}
                  value={values.role}
                  onChange={(e) => update("role", e.target.value)}
                />
                <FieldError field="role" />
              </div>

              <div className="respond-field respond-wide">
                <label htmlFor={id("message")}>
                  Message <span aria-hidden="true">*</span>
                </label>
                <textarea
                  {...fieldProps("message")}
                  ref={(el) => (fieldRefs.current.message = el)}
                  rows={5}
                  required
                  maxLength={LIMITS.message}
                  value={values.message}
                  onChange={(e) => update("message", e.target.value)}
                  aria-describedby={[errors.message ? errorId("message") : "", `${uid}-count`].filter(Boolean).join(" ")}
                />
                <p className="respond-count" id={`${uid}-count`}>
                  {values.message.length} / {LIMITS.message} characters
                </p>
                <FieldError field="message" />
              </div>

              <div className="respond-field respond-wide respond-consent">
                <input
                  {...fieldProps("consent")}
                  ref={(el) => (fieldRefs.current.consent = el)}
                  type="checkbox"
                  required
                  checked={values.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                <label htmlFor={id("consent")}>
                  I agree to be contacted back at the email above. <span aria-hidden="true">*</span>
                </label>
                <FieldError field="consent" />
              </div>
            </div>

            {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
            <div className="respond-hp" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Leave this empty</label>
              <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <p className="respond-privacy">Your details are used only to reply to you, nothing else. Fields marked * are required.</p>

            <div className="respond-actions">
              <button type="submit" className="respond-btn is-primary" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send response"}
              </button>
              <p className={`respond-notice${status === "failed" ? " is-error" : ""}`} role={status === "failed" ? "alert" : "status"}>
                {status === "failed" && (
                  <span className="respond-stamp is-returned" aria-hidden="true">
                    Returned
                  </span>
                )}
                {notice}
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default ResponseForm;
