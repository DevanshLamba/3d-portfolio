// Kept apart from the matcher so the main thread can route pasted job
// postings without loading the skill taxonomy.

/** Heuristic for routing a pasted job posting to the matcher instead of Q&A. */
export function looksLikeJobDescription(text: string): boolean {
  if (text.length < 220) return false;
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const cues = text.match(
    /\b(responsibilit|requirements?|qualifications?|experience with|you will|you'll|we are looking|we're looking|nice to have|must have|years of experience|about the role|the role|job description|apply)/gi
  );
  return (cues?.length ?? 0) >= 2 && (lines >= 3 || text.length > 500);
}
