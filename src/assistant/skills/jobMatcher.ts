// Client-side job matcher. A pasted job description never leaves the page:
// skills are extracted with the taxonomy, then each one is checked against
// the profile and labelled by the strongest kind of proof found.
//
//   Shipped       used in a project (or a project-backed role)
//   Core          part of the stack he leads with, or a service he offers
//   Listed        on the skills list, a certification or an achievement
//   Transferable  no direct proof, but a closely related skill is proven
//   Gap           nothing in the profile supports it

import type { ProfileData } from "../../data/profile.ts";
import { splitSentences } from "../text.ts";
import type { JobMatchResult, JobMatchRow, MatchEvidence, MatchStatus } from "../types.ts";
import { COMPILED_SKILLS, SKILLS_BY_ID, matchesAny, type CompiledSkill } from "./taxonomy.ts";

type Level = "shipped" | "core" | "listed";

interface EvidenceEntry extends MatchEvidence {
  level: Level;
  text: string;
}

const STATUS_CREDIT: Record<MatchStatus, number> = {
  shipped: 1,
  core: 0.8,
  listed: 0.55,
  transferable: 0.3,
  gap: 0,
};

const STATUS_ORDER: MatchStatus[] = ["shipped", "core", "listed", "transferable", "gap"];

const OPTIONAL_WORDS = /\b(nice[- ]to[- ]have|good[- ]to[- ]have|preferred|a plus|is a plus|bonus|desirable|ideally|optional|not required)\b/i;
const OPTIONAL_HEADING = /\b(nice|good) to have\b|\bpreferred\b|\bbonus\b|\bplus(es)?\b|\bdesirable\b|\boptional\b/i;
const REQUIRED_HEADING = /\b(requirements?|required|must[- ]haves?|qualifications?|what you('ll)? (need|bring)|you (have|bring)|skills|responsibilities|what you'll do|about you|tech stack)\b/i;

export interface ParsedJobDescription {
  skills: Map<string, { skill: CompiledSkill; required: boolean }>;
  years?: number;
  seniority?: "senior" | "junior";
}

export function parseJobDescription(text: string): ParsedJobDescription {
  const skills = new Map<string, { skill: CompiledSkill; required: boolean }>();
  let mode: "required" | "optional" = "required";

  const note = (segment: string, required: boolean) => {
    for (const skill of COMPILED_SKILLS) {
      if (!matchesAny(skill.jd, segment)) continue;
      const seen = skills.get(skill.id);
      // Asked for anywhere as a requirement means it's a requirement.
      skills.set(skill.id, { skill, required: required || Boolean(seen?.required) });
    }
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const isBullet = /^([-*•·▪◦]|\d+[.)])\s+/.test(line);
    const bare = line.replace(/[:#*_]+/g, "").trim();
    if (!isBullet && bare.length <= 50 && (line.endsWith(":") || bare.split(/\s+/).length <= 5)) {
      if (OPTIONAL_HEADING.test(bare)) mode = "optional";
      else if (REQUIRED_HEADING.test(bare)) mode = "required";
    }

    // "(Pinecone preferred)" makes Pinecone optional, not the rest of the line.
    const optionalAsides: string[] = [];
    const main = line.replace(/\(([^)]*)\)/g, (whole, inner: string) => {
      if (OPTIONAL_WORDS.test(inner)) {
        optionalAsides.push(inner);
        return " ";
      }
      return whole;
    });

    const lineOptional = mode === "optional" || OPTIONAL_WORDS.test(main);
    note(main, !lineOptional);
    optionalAsides.forEach((aside) => note(aside, false));
  }

  let years: number | undefined;
  for (const m of text.matchAll(/(\d{1,2})\s*\+?\s*(?:(?:-|to)\s*\d{1,2}\s*)?(?:years?|yrs?)\b/gi)) {
    years = Math.max(years ?? 0, Number(m[1]));
  }

  let seniority: ParsedJobDescription["seniority"];
  if (/\b(senior|sr\.?|staff|principal|lead engineer|tech lead)\b/i.test(text)) seniority = "senior";
  else if (/\b(junior|jr\.?|entry[- ]level|graduate|new grad|intern(ship)?|fresher|trainee)\b/i.test(text)) seniority = "junior";

  return { skills, years, seniority };
}

function trimQuote(text: string, max = 170): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Everything in the profile that can count as proof, tagged by strength. */
export function buildEvidenceCorpus(p: ProfileData): EvidenceEntry[] {
  const out: EvidenceEntry[] = [];

  for (const project of p.projects) {
    const base = { kind: "project" as const, sourceId: `project:${project.id}`, title: project.title, anchor: "work", level: "shipped" as const };
    const sentences = [
      project.category,
      `Stack: ${project.stack.join(", ")}`,
      ...(project.highlights ?? []).flatMap(splitSentences),
      ...(project.summary ? splitSentences(project.summary) : []),
      ...(project.learned ?? []),
      // `limits` is deliberately left out: "no high availability" must not
      // read as evidence of high availability.
    ];
    sentences.forEach((text) => out.push({ ...base, text, quote: trimQuote(text) }));
  }

  for (const entry of p.career) {
    out.push({
      kind: "experience",
      sourceId: entry.projectId ? `project:${entry.projectId}` : `career:${entry.id}`,
      title: `${entry.title} (${entry.role})`,
      anchor: "career",
      level: entry.projectId ? "shipped" : "core",
      text: `${entry.title} ${entry.role} ${entry.description}`,
      quote: trimQuote(entry.description),
    });
  }

  for (const service of p.services) {
    const text = `${service.subtitle}. ${service.description} ${service.tags.join(", ")}`;
    out.push({ kind: "service", sourceId: `service:${service.id}`, title: `Service: ${service.subtitle}`, anchor: "whatido", level: "core", text, quote: trimQuote(`Offers: ${service.tags.join(", ")}`) });
  }

  for (const group of p.skills) {
    for (const item of group.items) {
      out.push({
        kind: "skill",
        sourceId: `skills:${group.id}`,
        title: `Skills: ${group.label}`,
        level: group.core ? "core" : "listed",
        text: item,
        quote: `${item} (${group.core ? "core stack" : "skills list"})`,
      });
    }
  }

  for (const cert of p.certifications) {
    out.push({ kind: "certification", sourceId: "certifications", title: "Certifications", level: "listed", text: `${cert.name} ${cert.issuer}`, quote: `${cert.name} (${cert.issuer})` });
  }

  for (const item of p.achievements) {
    out.push({ kind: "achievement", sourceId: `achievement:${item.id}`, title: item.title, level: "listed", text: `${item.title}. ${item.detail}`, quote: trimQuote(item.detail) });
  }

  for (const sentence of splitSentences(p.about)) {
    out.push({ kind: "skill", sourceId: "about", title: "About", anchor: "about", level: "listed", text: sentence, quote: trimQuote(sentence) });
  }

  return out;
}

export interface SkillAssessment {
  status: MatchStatus;
  evidence: MatchEvidence[];
}

const LEVEL_RANK: Record<Level, number> = { shipped: 0, core: 1, listed: 2 };

export function createJobMatcher(p: ProfileData) {
  const corpus = buildEvidenceCorpus(p);
  const cache = new Map<string, SkillAssessment>();

  function direct(skill: CompiledSkill): SkillAssessment | null {
    const hits = corpus.filter((e) => matchesAny(skill.proof, e.text));
    if (!hits.length) return null;
    hits.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || Number(/\d/.test(b.quote)) - Number(/\d/.test(a.quote)));
    const best = hits[0].level;
    const evidence: MatchEvidence[] = [];
    const seen = new Set<string>();
    for (const hit of hits) {
      if (seen.has(hit.sourceId) || evidence.length >= 2) continue;
      seen.add(hit.sourceId);
      evidence.push({ kind: hit.kind, sourceId: hit.sourceId, title: hit.title, quote: hit.quote, anchor: hit.anchor });
    }
    return { status: best, evidence };
  }

  function assess(skillId: string): SkillAssessment {
    const cached = cache.get(skillId);
    if (cached) return cached;
    const skill = COMPILED_SKILLS.find((s) => s.id === skillId);
    if (!skill) return { status: "gap", evidence: [] };

    let result = direct(skill);
    if (!result) {
      const related = (skill.related ?? [])
        .map((id) => ({ id, found: COMPILED_SKILLS.find((s) => s.id === id) }))
        .map(({ found }) => (found ? { skill: found, hit: direct(found) } : null))
        .filter((r): r is { skill: CompiledSkill; hit: SkillAssessment } => Boolean(r?.hit));
      result = related.length
        ? {
            status: "transferable",
            evidence: related.slice(0, 2).map(({ skill: rel, hit }) => ({
              kind: "related" as const,
              sourceId: hit.evidence[0].sourceId,
              title: `Related: ${rel.label}`,
              quote: `${rel.label} is ${hit.status === "shipped" ? `shipped in ${hit.evidence[0].title}` : hit.status === "core" ? "part of his core stack" : "on his skills list"}.`,
              anchor: hit.evidence[0].anchor,
            })),
          }
        : { status: "gap", evidence: [] };
    }
    cache.set(skillId, result);
    return result;
  }

  function notes(parsed: ParsedJobDescription): string[] {
    const out: string[] = [];
    const edu = p.education[0];
    const firstYear = Math.min(
      ...p.projects.flatMap((proj) => (proj.period?.match(/\d{4}/g) ?? []).map(Number)).filter(Boolean)
    );
    if (parsed.years && parsed.years >= 2) {
      out.push(
        `The role asks for ${parsed.years}+ years of experience. ${p.firstName} is ${edu ? `studying (${edu.degree}, ${edu.period})` : "early in his career"}` +
          (Number.isFinite(firstYear) ? ` and his project work dates from ${firstYear}` : "") +
          ", so weigh the shipped evidence rather than years."
      );
    }
    if (parsed.seniority === "senior") out.push("It's pitched at a senior level; the shipped projects are the best signal of where he is.");
    if (parsed.seniority === "junior") out.push("It's pitched at entry level or as an internship, in line with his current stage as a student.");
    return out;
  }

  function verdict(score: number): string {
    if (score >= 80) return "Strong match";
    if (score >= 60) return "Good match";
    if (score >= 40) return "Partial match";
    return "Weak match";
  }

  return {
    assess,

    /** Assessment for a free-text skill name, e.g. "docker" or "vector DBs". */
    evidenceFor(skillText: string): (SkillAssessment & { skillId: string; label: string }) | null {
      const needle = skillText.trim();
      const skill =
        SKILLS_BY_ID[needle.toLowerCase()] ??
        COMPILED_SKILLS.find((s) => matchesAny(s.jd, needle)) ??
        COMPILED_SKILLS.find((s) => s.label.toLowerCase() === needle.toLowerCase());
      if (!skill) return null;
      return { skillId: skill.id, label: skill.label, ...assess(skill.id) };
    },

    match(text: string): JobMatchResult {
      const parsed = parseJobDescription(text);
      const rows: JobMatchRow[] = [...parsed.skills.values()].map(({ skill, required }) => ({
        skillId: skill.id,
        label: skill.label,
        family: skill.family,
        required,
        ...assess(skill.id),
      }));
      rows.sort(
        (a, b) =>
          Number(b.required) - Number(a.required) ||
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          a.label.localeCompare(b.label)
      );

      const counts = { shipped: 0, core: 0, listed: 0, transferable: 0, gap: 0 } as Record<MatchStatus, number>;
      rows.forEach((r) => counts[r.status]++);

      if (!rows.length) {
        return {
          score: 0,
          verdict: "No skills found",
          summary: "I couldn't spot any recognisable skills in that text. Paste the requirements section of the job description and try again.",
          rows,
          counts,
          notes: notes(parsed),
        };
      }

      let earned = 0;
      let possible = 0;
      for (const row of rows) {
        const weight = row.required ? 2 : 1;
        earned += weight * STATUS_CREDIT[row.status];
        possible += weight;
      }
      const score = Math.round((100 * earned) / possible);
      const v = verdict(score);
      const proven = counts.shipped + counts.core + counts.listed;
      const requiredGaps = rows.filter((r) => r.required && r.status === "gap").map((r) => r.label);

      return {
        score,
        verdict: v,
        summary:
          `${v} (${score}/100). ${proven} of ${rows.length} skills have direct evidence, ${counts.shipped} of them in shipped work.` +
          (requiredGaps.length ? ` Required gaps: ${requiredGaps.join(", ")}.` : " No required skill is a gap."),
        rows,
        counts,
        notes: notes(parsed),
      };
    },
  };
}

export type JobMatcher = ReturnType<typeof createJobMatcher>;

/** Heuristic for routing a pasted job posting to the matcher instead of Q&A. */
export function looksLikeJobDescription(text: string): boolean {
  if (text.length < 220) return false;
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  const cues = text.match(
    /\b(responsibilit|requirements?|qualifications?|experience with|you will|you'll|we are looking|we're looking|nice to have|must have|years of experience|about the role|the role|job description|apply)/gi
  );
  return (cues?.length ?? 0) >= 2 && (lines >= 3 || text.length > 500);
}
