// Phone-number detection shared by the privacy and contact tests.

// Any run of 10+ digits joined by spaces, dots, dashes or brackets.
const PHONE_RUN = /\+?\d[\d\s().-]{7,}\d/g;
// An Indian mobile number, with or without +91.
const INDIAN_MOBILE = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/;

/** Phone-like patterns found in a piece of text. */
export function phoneLeaks(text: string): string[] {
  const found: string[] = [];
  for (const run of text.match(PHONE_RUN) ?? []) {
    if (run.replace(/\D/g, "").length >= 10) found.push(`phone-like "${run.trim()}"`);
  }
  const mobile = text.match(INDIAN_MOBILE);
  if (mobile) found.push(`mobile number "${mobile[0]}"`);
  if (/\btel:/i.test(text)) found.push("tel: link");
  return found;
}
