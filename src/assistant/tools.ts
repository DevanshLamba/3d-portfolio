// Tool registry. Each tool has a JSON schema in the shape OpenAI-compatible
// function-calling APIs expect, so the same registry can back a live model
// later. Tools only return public profile data.

import type { ProfileData, Project } from "../data/profile.ts";
import { usableLink } from "./knowledge.ts";
import type { TfIdfIndex } from "./retrieval.ts";
import type { JobMatcher } from "./skills/jobMatcher.ts";
import { COMPILED_SKILLS, matchesAny } from "./skills/taxonomy.ts";
import type { JsonSchema, ToolSchema } from "./types.ts";

export interface ToolContext {
  profile: ProfileData;
  index: TfIdfIndex;
  matcher: JobMatcher;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: JsonSchema;
  run(args: Record<string, unknown>, ctx: ToolContext): unknown;
}

/** A project as tools may expose it: no demo credentials, no dead links. */
export function publicProject(project: Project) {
  return {
    id: project.id,
    title: project.title,
    category: project.category,
    status: project.status,
    period: project.period,
    role: project.role,
    stack: project.stack,
    summary: project.summary,
    highlights: project.highlights ?? [],
    learned: project.learned ?? [],
    limits: project.limits,
    link: usableLink(project.link),
    links: (project.links ?? []).filter((l) => usableLink(l.href)),
  };
}

function projectText(project: Project): string {
  return [project.category, ...project.stack, ...(project.highlights ?? []), project.summary ?? "", ...(project.learned ?? [])].join(" \n ");
}

const noArgs: JsonSchema = { type: "object", properties: {}, required: [] };

export const TOOLS: ToolDef[] = [
  {
    name: "search_portfolio",
    description: "Search the portfolio's indexed facts and return the most relevant ones with scores.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for." },
        top_k: { type: "integer", description: "How many facts to return.", minimum: 1, maximum: 8 },
      },
      required: ["query"],
    },
    run(args, ctx) {
      const { hits } = ctx.index.search(String(args.query), { topK: Number(args.top_k ?? 3) });
      return { results: hits.map((h) => ({ id: h.id, title: h.title, text: h.text, score: Number(h.score.toFixed(3)) })) };
    },
  },
  {
    name: "list_projects",
    description: "List projects, optionally only those that use a given technology.",
    parameters: {
      type: "object",
      properties: { technology: { type: "string", description: "e.g. Python, Docker, React Native" } },
      required: [],
    },
    run(args, ctx) {
      const tech = typeof args.technology === "string" ? args.technology.trim() : "";
      let projects = ctx.profile.projects;
      if (tech) {
        const skill = COMPILED_SKILLS.find((s) => matchesAny(s.jd, tech));
        projects = projects.filter((proj) =>
          skill ? matchesAny(skill.proof, projectText(proj)) : projectText(proj).toLowerCase().includes(tech.toLowerCase())
        );
      }
      return {
        technology: tech || undefined,
        projects: projects.map((proj) => ({
          id: proj.id,
          title: proj.title,
          category: proj.category,
          status: proj.status,
          stack: proj.stack,
          link: usableLink(proj.link),
        })),
      };
    },
  },
  {
    name: "get_project",
    description: "Full public details for one project.",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "Project name, e.g. Siliqo." } },
      required: ["name"],
    },
    run(args, ctx) {
      const name = String(args.name).toLowerCase().trim();
      const project = ctx.profile.projects.find((proj) => proj.title.toLowerCase() === name || proj.id === name);
      if (!project) return { found: false, available: ctx.profile.projects.map((proj) => proj.title) };
      return { found: true, project: publicProject(project) };
    },
  },
  {
    name: "get_skill_evidence",
    description: "How strongly the portfolio evidences a skill (shipped, core, listed, transferable or gap), with proof.",
    parameters: {
      type: "object",
      properties: { skill: { type: "string", description: "Skill or technology name." } },
      required: ["skill"],
    },
    run(args, ctx) {
      const result = ctx.matcher.evidenceFor(String(args.skill));
      return result ? { found: true, ...result } : { found: false, skill: String(args.skill) };
    },
  },
  {
    name: "get_education",
    description: "Degree, institution, dates and grades.",
    parameters: noArgs,
    run: (_args, ctx) => ({ education: ctx.profile.education }),
  },
  {
    name: "get_certifications",
    description: "Certifications and their issuers.",
    parameters: noArgs,
    run: (_args, ctx) => ({ certifications: ctx.profile.certifications }),
  },
  {
    name: "get_contact",
    description: "Public ways to get in touch. Never includes a phone number.",
    parameters: noArgs,
    run(_args, ctx) {
      const { contact, resume } = ctx.profile;
      return {
        primary: usableLink(contact.connect.href) ? { label: "LinkedIn", href: contact.connect.href } : undefined,
        socials: contact.socials.filter((s) => usableLink(s.href)).map((s) => ({ label: s.label, href: s.href })),
        resume: usableLink(resume),
      };
    },
  },
  {
    name: "match_job",
    description: "Compare a job description against the portfolio and label each required skill.",
    parameters: {
      type: "object",
      properties: { job_description: { type: "string", description: "The pasted job description." } },
      required: ["job_description"],
    },
    run(args, ctx) {
      const result = ctx.matcher.match(String(args.job_description));
      return {
        score: result.score,
        summary: result.summary,
        notes: result.notes,
        skills: result.rows.map((r) => ({ skill: r.label, required: r.required, status: r.status })),
      };
    },
  },
];

export function toolSchemas(): ToolSchema[] {
  return TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Minimal schema check: required keys present and primitive types right. */
export function validateArgs(schema: JsonSchema, args: Record<string, unknown>): string | null {
  for (const key of schema.required ?? []) {
    if (args[key] === undefined || args[key] === "") return `Missing required argument "${key}".`;
  }
  for (const [key, value] of Object.entries(args)) {
    const prop = schema.properties?.[key];
    if (!prop) return `Unknown argument "${key}".`;
    if (value === undefined) continue;
    const ok =
      prop.type === "string" ? typeof value === "string" :
      prop.type === "integer" ? Number.isInteger(value) :
      prop.type === "number" ? typeof value === "number" :
      prop.type === "boolean" ? typeof value === "boolean" :
      true;
    if (!ok) return `Argument "${key}" should be ${prop.type}.`;
    if (typeof value === "number" && ((prop.minimum !== undefined && value < prop.minimum) || (prop.maximum !== undefined && value > prop.maximum))) {
      return `Argument "${key}" is out of range.`;
    }
  }
  return null;
}

export function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): unknown {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool "${name}".`);
  const problem = validateArgs(tool.parameters, args);
  if (problem) throw new Error(problem);
  return tool.run(args, ctx);
}
