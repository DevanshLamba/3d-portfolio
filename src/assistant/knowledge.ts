// Turns the profile into small, tagged, citable facts. This is the only place
// that decides what the assistant is allowed to know, so the privacy rules
// live here too:
//   - contact.email and project demo credentials are never read; there is
//     no phone number in the profile at all
//   - anything that still looks like a phone number is redacted
//   - blank or placeholder links are skipped instead of producing dead links

import { isPlaceholder, type ProfileData, type Project } from "../data/profile.ts";
import { splitSentences } from "./text.ts";
import type { Chunk, Section } from "./types.ts";

export const SECTION_ANCHORS: Partial<Record<Section, string>> = {
  profile: "landingDiv",
  about: "about",
  services: "whatido",
  experience: "career",
  projects: "work",
  contact: "contact",
};

const PHONE_LIKE = /\+?\d[\d\s().-]{7,}\d/g;
const EMAIL_LIKE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

/**
 * Defence in depth: strips email addresses and anything with ten or more
 * digits in a phone-ish run, in case one slips into the profile's prose.
 */
export function redactSensitive(text: string): string {
  return text
    .replace(EMAIL_LIKE, "[redacted]")
    .replace(PHONE_LIKE, (match) => (match.replace(/\D/g, "").length >= 10 ? "[redacted]" : match));
}

/** redactSensitive applied to every string inside a JSON-like value. */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactSensitive(value) as T;
  if (Array.isArray(value)) return value.map(redactDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)])) as T;
  }
  return value;
}

export function usableLink(href: string | undefined): string | undefined {
  return href && !isPlaceholder(href) ? href : undefined;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.+#-]+/)
    .filter((w) => w.length > 1);
}

function sentenceCase(text: string): string {
  // "AI & AUTOMATION" reads as shouting inside a sentence.
  return text === text.toUpperCase()
    ? text.toLowerCase().replace(/\b(ai|api|apis|llm)\b/g, (m) => m.toUpperCase())
    : text;
}

function codeFact(project: Project, firstName: string): string | null {
  const name = project.title;
  if (project.repo?.visibility === "private") {
    return `${name}'s source code is private, so there is no public repository, but ${firstName} can walk you through the code on request.`;
  }
  if (project.repo?.visibility === "public") {
    const github = usableLink(project.links?.find((l) => /github/i.test(l.label) || /github\.com/.test(l.href))?.href);
    return (
      `${name} is open source${project.repo.license ? ` under the ${project.repo.license} license` : ""}.` +
      (github ? ` Its code is on GitHub: ${github}` : "")
    );
  }
  return null;
}

function statusWord(project: Project): string {
  switch (project.status) {
    case "live":
      return "live";
    case "in-development":
      return "in development";
    case "learning":
      return "a learning project";
  }
}

function groupSentences(text: string, perChunk: number): string[] {
  const sentences = splitSentences(text);
  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += perChunk) {
    groups.push(sentences.slice(i, i + perChunk).join(" "));
  }
  return groups;
}

export function buildKnowledge(p: ProfileData): Chunk[] {
  const chunks: Chunk[] = [];
  const add = (chunk: Chunk) => {
    if (!chunk.text.trim()) return;
    chunks.push({
      ...chunk,
      text: redactSensitive(chunk.text.trim()),
      anchor: chunk.anchor ?? SECTION_ANCHORS[chunk.section],
    });
  };

  add({
    id: "profile:identity",
    sourceId: "profile",
    section: "profile",
    title: `Who ${p.name} is`,
    text:
      `${p.name} is a ${p.role.toLowerCase()} based in ${p.location}, working on ${p.headline.toLowerCase()}. ` +
      `His focus: ${p.contact.focus.join("; ")}.`,
    tags: ["who", "intro", "introduction", "name", "role", "background", "summary", "based", "location", "focus", "yourself"],
  });

  groupSentences(p.about, 2).forEach((text, i) => {
    add({
      id: `about:${i}`,
      sourceId: "about",
      section: "about",
      title: `In ${p.firstName}'s words`,
      text,
      tags: ["about", "background", "bio", "story", "values", "care"],
    });
  });

  for (const service of p.services) {
    add({
      id: `service:${service.id}`,
      sourceId: `service:${service.id}`,
      section: "services",
      title: `What he does: ${sentenceCase(service.title)}`,
      text: `${sentenceCase(service.title)}, ${service.subtitle.toLowerCase()}. ${service.description} Skills and tools: ${service.tags.join(", ")}.`,
      tags: ["services", "offer", "help", "freelance", "consulting", ...service.tags.flatMap(words)],
    });
  }

  for (const entry of p.career) {
    const when = entry.when.toUpperCase() === "NOW" ? "current" : entry.when.toLowerCase();
    add({
      id: `career:${entry.id}`,
      sourceId: entry.projectId ? `project:${entry.projectId}` : `career:${entry.id}`,
      section: "experience",
      title: `${entry.title} (${entry.role})`,
      text: `${entry.title}, ${entry.role.toLowerCase()} (${when}). ${entry.description}`,
      tags: ["experience", "career", "journey", "timeline", "role", "job", ...words(entry.role)],
    });
  }

  for (const project of p.projects) {
    const name = project.title;
    const nameTags = ["project", name.toLowerCase()];
    const link = usableLink(project.link);
    // Every sentence names the project, so any one of them can be quoted alone.
    const overview = [
      `${name} (${project.category}) is ${statusWord(project)}${project.period ? `, ${project.period}` : ""}.`,
      project.role ? `On ${name}, ${p.firstName}'s role: ${project.role.toLowerCase()}.` : "",
      project.summary ?? "",
      `${name} is built with ${project.stack.join(", ")}.`,
      project.deployed === false
        ? `${name} is not live yet: it has no public deployment${link ? `, only a landing site at ${link}` : ""}.`
        : link
          ? `${name} link: ${link}`
          : "",
    ]
      .filter(Boolean)
      .join(" ");

    add({
      id: `project:${project.id}`,
      sourceId: `project:${project.id}`,
      section: "projects",
      title: `Project: ${name}`,
      text: overview,
      tags: [...nameTags, "projects", "built", "build", "work", "portfolio", "overview", "stack", ...project.stack.flatMap(words)],
      weight: 1.15,
    });

    const code = codeFact(project, p.firstName);
    if (code) {
      add({
        id: `project:${project.id}:code`,
        sourceId: `project:${project.id}`,
        section: "projects",
        title: `${name}: source code`,
        text: code,
        tags: [...nameTags, "code", "source", "repo", "repository", "github", "open source", "opensource", "license", "private", "public", "see"],
      });
    }

    project.highlights?.forEach((highlight, i) => {
      add({
        id: `project:${project.id}:highlight:${i}`,
        sourceId: `project:${project.id}`,
        section: "projects",
        title: `${name}: technical detail`,
        text: `${name}: ${highlight}`,
        tags: [...nameTags, "technical", "architecture", "how", "design", "details"],
        weight: 1.0,
      });
    });

    project.learned?.forEach((item, i) => {
      add({
        id: `project:${project.id}:learned:${i}`,
        sourceId: `project:${project.id}`,
        section: "projects",
        title: `${name}: what he learned`,
        text: `What he learned building ${name}: ${item}.`,
        tags: [...nameTags, "learned", "learn", "lesson", "takeaway"],
      });
    });

    if (project.planned?.length) {
      add({
        id: `project:${project.id}:planned`,
        sourceId: `project:${project.id}`,
        section: "projects",
        title: `${name}: planned, not shipped yet`,
        text: `Planned for ${name} and not shipped yet: ${project.planned.join("; ")}.`,
        tags: [...nameTags, "planned", "roadmap", "next", "future", "upcoming", "whatsapp", "voice"],
      });
    }

    if (project.limits) {
      add({
        id: `project:${project.id}:limits`,
        sourceId: `project:${project.id}`,
        section: "projects",
        title: `${name}: limitations`,
        text: `${name}'s limitations: ${project.limits}`,
        tags: [...nameTags, "limits", "limitations", "tradeoffs", "production", "scale"],
      });
    }

    project.links?.forEach((item, i) => {
      const href = usableLink(item.href);
      if (!href) return;
      add({
        id: `project:${project.id}:link:${i}`,
        sourceId: `project:${project.id}`,
        section: "projects",
        title: `${name}: ${item.label}`,
        text: `${name} ${item.label.toLowerCase()}: ${href}`,
        tags: [...nameTags, "link", "source", "code", "repo", "repository", "demo", ...words(item.label)],
        weight: 0.9,
      });
    });
  }

  for (const group of p.skills) {
    add({
      id: `skills:${group.id}`,
      sourceId: `skills:${group.id}`,
      section: "skills",
      title: `Skills: ${group.label}`,
      text:
        `${group.label}: ${group.items.join(", ")}.` +
        (group.core ? " These are part of his core stack." : " These are supporting tools he has used."),
      tags: ["skills", "skill", "stack", "tech", "technology", "technologies", "tools", "languages", ...words(group.label)],
      // A bare list of names; let prose that explains something outrank it.
      weight: 0.85,
    });
  }

  for (const edu of p.education) {
    add({
      id: `education:${edu.id}`,
      sourceId: `education:${edu.id}`,
      section: "education",
      title: `Education: ${edu.degree}`,
      text:
        `He is studying for a ${edu.degree} at ${edu.institution}, ${edu.location} (${edu.period}).` +
        (edu.detail && !isPlaceholder(edu.detail) ? ` ${edu.detail}.` : ""),
      tags: ["education", "degree", "college", "university", "study", "studied", "student", "school", "cgpa", "gpa", "grades", "btech", "qualification"],
    });
  }

  if (p.certifications.length) {
    add({
      id: "certifications",
      sourceId: "certifications",
      section: "certifications",
      title: "Certifications",
      text: `His certifications: ${p.certifications.map((c) => `${c.name} (${c.issuer})`).join("; ")}.`,
      tags: ["certifications", "certification", "certified", "certificate", "courses", "course", "credentials"],
    });
  }

  for (const item of p.achievements) {
    add({
      id: `achievement:${item.id}`,
      sourceId: `achievement:${item.id}`,
      section: "achievements",
      title: `Achievement: ${item.title}`,
      text: `${item.title}. ${item.detail}`,
      tags: ["achievements", "achievement", "accomplishments", "proud", "highlights"],
    });
  }

  for (const note of p.notes) {
    if (isPlaceholder(note.text) || isPlaceholder(note.title)) continue;
    groupSentences(note.text, 3).forEach((text, i) => {
      add({
        id: `note:${note.id}:${i}`,
        sourceId: `note:${note.id}`,
        section: "notes",
        title: note.title,
        text,
        tags: ["notes", ...note.tags],
        // Written specifically to answer questions.
        weight: 1.1,
      });
    });
  }

  const primary = usableLink(p.contact.connect.href);
  const socials = p.contact.socials
    .map((s) => ({ ...s, href: usableLink(s.href) }))
    .filter((s): s is typeof s & { href: string } => Boolean(s.href) && s.href !== primary);
  const resume = usableLink(p.resume);
  add({
    id: "contact",
    sourceId: "contact",
    section: "contact",
    title: "How to get in touch",
    text:
      `The best way to reach ${p.firstName} is the "Leave a response" form in the Contact section: leave your name, email and a short message and he replies by email. ` +
      "He prefers that to phone calls and doesn't share a phone number here. " +
      (primary ? `He is also on LinkedIn: ${primary}. ` : "") +
      (socials.length ? `You can follow his work on ${socials.map((s) => `${s.label} (${s.href})`).join(", ")}. ` : "") +
      (resume ? `His résumé is linked on the page at ${resume}. ` : ""),
    tags: ["contact", "reach", "hire", "hiring", "touch", "connect", "message", "email", "mail", "phone", "call", "socials", "social", "linkedin", "github", "twitter", "youtube", "instagram", "resume", "cv", "available", "availability", "form", "response", "respond", "whatsapp", "talk", "interview"],
  });

  return chunks;
}
