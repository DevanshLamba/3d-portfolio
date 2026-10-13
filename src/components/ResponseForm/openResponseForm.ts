// Anything on the page (contact section, navbar, assistant, palette, tour,
// pitches) opens the response form through this one event.

export const RESPONSE_FORM_ID = "respond";
export const RESPONSE_FORM_EVENT = "portfolio:open-response-form";

/** Scrolls to the "Leave a response" form and puts the cursor in its first field. */
export function openResponseForm() {
  window.dispatchEvent(new CustomEvent(RESPONSE_FORM_EVENT));
}
