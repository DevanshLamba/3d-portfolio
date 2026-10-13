// Audience pitches: a short, tailored summary for each kind of visitor. The
// facts come from the profile; `profile.assistant.pitches` only chooses which
// projects, skill groups and actions each audience sees.

import type { Audience, PitchConfig, ProfileData } from "../../data/profile.ts";
import { redactSensitive, usableLink } from "../knowledge.ts";
import { splitSentences } from "../text.ts";

export interface PitchAction {
  label: string;
  /** External link or file. */
  href?: string;
  /** Page section to navigate to. */
  anchor?: string;
  /** Another assistant skill to open. */
  skill?: "match" | "tour";
}

export interface Pitch {
  audience: Audience;
  label: string;
  text: string;
  points: string[];
  actions: PitchAction[];
}

export const AUDIENCES: Audience[] = ["recruiter", "engineer", "founder", "browsing"];

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function resolveAction(p: ProfileData, action: PitchConfig["actions"][number]): PitchAction | null {
  const social = (id: string) => usableLink(p.contact.socials.find((s) => s.id === id)?.href);
  switch (action) {
    case "resume": {
      const href = usableLink(p.resume);
      return href ? { label: "Résumé", href } : null;
    }
    case "linkedin": {
      const href = social("linkedin");
      return href ? { label: "LinkedIn", href } : null;
    }
    case "github": {
      const href = social("github");
      return href ? { label: "GitHub", href } : null;
    }
    case "contact":
      return { label: "Contact", anchor: "contact" };
    case "work":
      return { label: "See the work", anchor: "work" };
    case "match":
      return { label: "Match a job description", skill: "match" };
    case "tour":
      return { label: "Take the tour", skill: "tour" };
    default: {
      const project = p.projects.find((proj) => `project:${proj.id}` === action);
      const href = usableLink(project?.link);
      return project && href ? { label: `${project.title} site`, href } : null;
    }
  }
}

export function buildPitch(p: ProfileData, audience: Audience): Pitch {
  const config = p.assistant.pitches[audience];
  const projects = config.projectIds
    .map((id) => p.projects.find((proj) => proj.id === id))
    .filter((proj): proj is NonNullable<typeof proj> => Boolean(proj));
  // The first few of each chosen group keeps the pitch to a 30-second read.
  const stack = config.skillGroupIds
    .map((id) => p.skills.find((g) => g.id === id))
    .flatMap((g) => g?.items.slice(0, 3) ?? []);
  const careerFor = (projectId: string) => p.career.find((c) => c.projectId === projectId);
  const edu = p.education[0];

  let text: string;
  let points: string[];

  switch (audience) {
    case "recruiter":
      text = [
        `${p.name}, ${p.role.toLowerCase()} based in ${p.location}.`,
        edu ? `Studying for a ${edu.degree} at ${edu.institution} (${edu.period}${edu.detail ? `, ${edu.detail}` : ""}).` : "",
        `Projects: ${listOf(projects.map((proj) => `${proj.title} (${proj.category})`))}.`,
        stack.length ? `Core stack: ${stack.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      points = projects.map((proj) => careerFor(proj.id)?.description ?? proj.category);
      break;

    case "engineer":
      text = [
        `What's under the hood of ${listOf(projects.map((proj) => proj.title))}.`,
        stack.length ? `Day to day: ${stack.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      points = projects.flatMap((proj) => (proj.highlights ?? []).slice(0, 2)).slice(0, 3);
      break;

    case "founder":
      text = projects
        .map((proj) => {
          const career = careerFor(proj.id);
          return career ? `${proj.title}, as ${career.role.toLowerCase()}: ${splitSentences(career.description)[0]}` : `${proj.title}: ${proj.category}.`;
        })
        .join(" ");
      points = projects.flatMap((proj) => (proj.highlights ?? []).slice(0, 1));
      break;

    case "browsing":
      text = [
        `${p.name}: ${p.headline.toLowerCase()}.`,
        `In his words: “${splitSentences(p.about)[0]}”`,
        `On this page: ${listOf(projects.map((proj) => proj.title))}.`,
      ].join(" ");
      points = [];
      break;
  }

  const actions = config.actions
    .map((a) => resolveAction(p, a))
    .filter((a): a is PitchAction => a !== null);

  return { audience, label: config.label, text: redactSensitive(text), points: points.map(redactSensitive), actions };
}
