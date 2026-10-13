// A small plan → act → observe loop over the tool registry. Planning is
// deterministic and local: the goal is split into sub-questions, each one is
// routed to a tool, and the observations are stitched into a cited answer.
// Every step is reported so the UI can show its work.

import { looksLikeJobDescription } from "./skills/jobMatcher.ts";
import { findSkills } from "./skills/taxonomy.ts";
import { runTool, type ToolContext } from "./tools.ts";
import type { AgentRun, AgentStep, MatchStatus } from "./types.ts";

export interface PlannedCall {
  subGoal: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface AgentOptions {
  maxCalls?: number;
  onStep?: (step: AgentStep) => void;
}

const STATUS_WORDS: Record<MatchStatus, string> = {
  shipped: "shipped in real work",
  core: "part of his core stack",
  listed: "on his skills list",
  transferable: "not used directly, but transferable",
  gap: "not evidenced",
};

const SPLIT =
  /\?|;|\.\s|\b(?:and then|then|also|plus)\b|\band\b(?=\s+(?:what|how|where|who|which|does|did|has|is|are|can|list|show|tell|get|give|find)\b)/i;

export function decompose(goal: string): string[] {
  return goal
    .split(SPLIT)
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s && s.length > 2));
}

export function plan(goal: string, ctx: ToolContext): PlannedCall[] {
  if (looksLikeJobDescription(goal)) {
    return [{ subGoal: "Match this job description", tool: "match_job", args: { job_description: goal } }];
  }

  const calls: PlannedCall[] = [];
  for (const subGoal of decompose(goal)) {
    const q = subGoal.toLowerCase();
    const project = ctx.profile.projects.find((proj) => new RegExp(`\\b${proj.title.toLowerCase()}\\b`).test(q));
    const skills = findSkills(subGoal);

    if (project) {
      calls.push({ subGoal, tool: "get_project", args: { name: project.title } });
    } else if (/\b(projects?|built|build|portfolio|shipped|work(ed)? on)\b/.test(q)) {
      calls.push({ subGoal, tool: "list_projects", args: skills[0] ? { technology: skills[0].label } : {} });
    } else if (/\b(contact|reach|email|hire|linkedin|get in touch|socials?)\b/.test(q)) {
      calls.push({ subGoal, tool: "get_contact", args: {} });
    } else if (/\b(stud(y|ied|ies|ying)|education|degree|college|university|cgpa|gpa)\b/.test(q)) {
      calls.push({ subGoal, tool: "get_education", args: {} });
    } else if (/\bcertif/.test(q)) {
      calls.push({ subGoal, tool: "get_certifications", args: {} });
    } else if (skills.length) {
      skills.slice(0, 2).forEach((s) => calls.push({ subGoal, tool: "get_skill_evidence", args: { skill: s.label } }));
    } else {
      calls.push({ subGoal, tool: "search_portfolio", args: { query: subGoal, top_k: 2 } });
    }
  }
  return calls;
}

type Obs = Record<string, unknown>;

function observe(tool: string, output: Obs): string {
  switch (tool) {
    case "search_portfolio": {
      const results = output.results as { title: string }[];
      return results.length ? `${results.length} facts; best match "${results[0].title}".` : "No matching facts.";
    }
    case "list_projects":
      return `${(output.projects as unknown[]).length} project(s).`;
    case "get_project":
      return output.found ? `Loaded ${(output.project as { title: string }).title}.` : "No project by that name.";
    case "get_skill_evidence":
      return output.found ? `${output.label}: ${output.status}.` : `"${output.skill}" isn't in the skill vocabulary.`;
    case "get_contact":
      return `${(output.socials as unknown[]).length} public channels.`;
    case "get_education":
      return `${(output.education as unknown[]).length} education entr${(output.education as unknown[]).length === 1 ? "y" : "ies"}.`;
    case "get_certifications":
      return `${(output.certifications as unknown[]).length} certification(s).`;
    case "match_job":
      return String(output.summary);
    default:
      return "Done.";
  }
}

function synthesise(tool: string, args: Record<string, unknown>, output: Obs, firstName: string): string {
  switch (tool) {
    case "search_portfolio": {
      const results = output.results as { text: string }[];
      return results.length ? results[0].text : `I couldn't find that in ${firstName}'s portfolio.`;
    }
    case "list_projects": {
      const projects = output.projects as { title: string; category: string }[];
      const scope = output.technology ? ` using ${output.technology}` : "";
      return projects.length
        ? `Projects${scope}: ${projects.map((p) => `${p.title} (${p.category})`).join("; ")}.`
        : `No projects${scope} in the portfolio.`;
    }
    case "get_project": {
      if (!output.found) return `There's no project called "${args.name}". Projects: ${(output.available as string[]).join(", ")}.`;
      const p = output.project as { title: string; category: string; stack: string[]; highlights: string[]; summary?: string };
      return `${p.title}: ${p.category}. ${p.highlights[0] ?? p.summary ?? ""} Stack: ${p.stack.join(", ")}.`.replace(/\s+/g, " ");
    }
    case "get_skill_evidence": {
      if (!output.found) return `I have no record of ${String(output.skill)}.`;
      const evidence = output.evidence as { title: string; quote: string }[];
      const status = output.status as MatchStatus;
      return `${output.label} is ${STATUS_WORDS[status]}${evidence[0] ? `: ${evidence[0].quote} (${evidence[0].title})` : "."}`;
    }
    case "get_contact": {
      const socials = output.socials as { label: string; href: string }[];
      const primary = output.primary as { href: string } | undefined;
      return `The best way to reach ${firstName} is the "Leave a response" form on this page; he replies by email. ${primary ? `He is also on LinkedIn: ${primary.href}. ` : ""}Follow his work on ${socials
        .filter((s) => s.href !== primary?.href)
        .map((s) => s.label)
        .join(", ")}.`;
    }
    case "get_education": {
      const edu = output.education as { degree: string; institution: string; period: string; detail?: string }[];
      return edu.map((e) => `${e.degree} at ${e.institution} (${e.period})${e.detail ? `, ${e.detail}` : ""}.`).join(" ");
    }
    case "get_certifications": {
      const certs = output.certifications as { name: string; issuer: string }[];
      return `Certifications: ${certs.map((c) => `${c.name} (${c.issuer})`).join("; ")}.`;
    }
    case "match_job":
      return String(output.summary);
    default:
      return "";
  }
}

export function runAgent(goal: string, ctx: ToolContext, options: AgentOptions = {}): AgentRun {
  const steps: AgentStep[] = [];
  const push = (step: AgentStep) => {
    steps.push(step);
    options.onStep?.(step);
  };

  const calls = plan(goal, ctx).slice(0, options.maxCalls ?? 4);
  push({
    kind: "plan",
    text: calls.length
      ? calls.map((c, i) => `${i + 1}. ${c.subGoal} → ${c.tool}`).join("\n")
      : "Nothing to do: the goal was empty.",
  });

  const parts: string[] = [];
  calls.forEach((call) => {
    push({ kind: "act", text: `Calling ${call.tool}`, tool: call.tool, args: call.args });
    try {
      const output = runTool(call.tool, call.args, ctx) as Obs;
      push({ kind: "observe", text: observe(call.tool, output), tool: call.tool, output });
      const sentence = synthesise(call.tool, call.args, output, ctx.profile.firstName);
      if (sentence) parts.push(`${sentence} (via ${call.tool})`);
    } catch (err) {
      push({ kind: "observe", text: `Tool failed: ${(err as Error).message}`, tool: call.tool });
    }
  });

  const answer = parts.join("\n\n") || `I couldn't work that out from ${ctx.profile.firstName}'s portfolio.`;
  push({ kind: "answer", text: answer });
  return { goal, steps, answer };
}
