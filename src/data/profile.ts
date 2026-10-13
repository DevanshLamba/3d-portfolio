// Single source of truth for the portfolio's content. The page sections and
// the in-browser assistant both read from here, so edit facts in this file
// only. Fields marked `private` are rendered on the page where they already
// appear but are never indexed by the assistant.

export interface LinkItem {
  label: string;
  href: string;
}

export interface SocialLink extends LinkItem {
  id: "github" | "linkedin" | "x" | "youtube" | "instagram";
  handle: string;
}

export type ProjectStatus = "live" | "in-development" | "learning";

export interface Project {
  id: string;
  title: string;
  category: string;
  stack: string[];
  image: string;
  alt?: string;
  link: string;
  status: ProjectStatus;
  period?: string;
  role?: string;
  /** Résumé-level detail. Indexed by the assistant, not shown on the card. */
  highlights?: string[];
  summary?: string;
  learned?: string[];
  limits?: string;
  /** Shown on the card only; never indexed. */
  demo?: { username: string; password: string };
  links?: LinkItem[];
}

export interface CareerEntry {
  id: string;
  title: string;
  role: string;
  when: string;
  description: string;
  projectId?: string;
}

export interface Service {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface SkillGroup {
  id: string;
  label: string;
  /** Core groups are the stack Devansh leads with; the rest are supporting. */
  core: boolean;
  items: string[];
}

export interface Education {
  id: string;
  institution: string;
  location: string;
  degree: string;
  period: string;
  detail?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
}

export type Audience = "recruiter" | "engineer" | "founder" | "browsing";

export interface PitchConfig {
  label: string;
  projectIds: string[];
  skillGroupIds: string[];
  actions: ("resume" | "linkedin" | "github" | "contact" | "work" | "match" | "tour" | `project:${string}`)[];
}

export interface TourStopConfig {
  id: string;
  /** DOM id of the section the stop points at. */
  targetId: string;
  title: string;
  kind: "intro" | "about" | "services" | "career" | "work" | "contact";
}

export interface ProfileData {
  name: string;
  firstName: string;
  role: string;
  headline: string;
  location: string;
  site: string;
  resume: string;
  about: string;
  services: Service[];
  career: CareerEntry[];
  projects: Project[];
  skills: SkillGroup[];
  education: Education[];
  certifications: Certification[];
  achievements: Achievement[];
  contact: {
    phone: { display: string; href: string; private: true };
    connect: LinkItem;
    focus: string[];
    socials: SocialLink[];
  };
  assistant: {
    pitches: Record<Audience, PitchConfig>;
    tour: TourStopConfig[];
  };
}

export const DEMO_PASSWORD_PLACEHOLDER = "DEMO_PASSWORD_HERE";

/** True for blank values and the placeholders used while a field is pending. */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return true;
  const v = value.trim();
  return (
    v === "" ||
    v === "#" ||
    v === DEMO_PASSWORD_PLACEHOLDER ||
    /^(todo|tbd|placeholder|coming soon)$/i.test(v) ||
    /example\.(com|org)/i.test(v)
  );
}

export const profile: ProfileData = {
  name: "Devansh Lamba",
  firstName: "Devansh",
  role: "Backend engineer",
  headline: "Backend Systems & Automation",
  location: "Pune, Maharashtra, India",
  site: "https://devanshlamba.in/",
  // The one place the résumé is linked from: the corner button, the
  // assistant's contact answer, the recruiter pitch and the get_contact tool.
  // The current PDF includes a phone number; before deploying, point this at a
  // phone-free copy in public/, or set it to "" to hide every résumé link.
  resume: "/Devansh_Lamba_Resume.pdf",

  about:
    "I'm a backend engineer who builds systems that ship, not slideware. I designed and built Siliqo solo — a multi-tenant agentic customer support platform with 7,400+ lines of code, 38 API endpoints, and 68 passing tests, running RAG on PostgreSQL + pgvector behind a provider-agnostic LLM layer across OpenAI, Anthropic, and Google. Right now I'm building Vayris, an open-source local-first AI agent for Windows, and I founded Ordo, a hyperlocal quick-commerce platform, taking it from an idea to real APIs and a live mobile app. What I care about: architecture that holds up under real usage, automation that removes grunt work, and code that's still readable a year later. Outside engineering, I document the process — currently at 1K+ subscribers across platforms.",

  services: [
    {
      id: "ai-automation",
      title: "AI & AUTOMATION",
      subtitle: "Workflow Intelligence for Organizations",
      description:
        "AI specialist helping organizations automate workflows—internal ops and customer-facing—so teams ship faster with less manual work.",
      tags: [
        "LLMs & agents",
        "Workflow design",
        "RAG & retrieval",
        "Evals & guardrails",
        "Integrations",
        "Product strategy",
      ],
    },
    {
      id: "build-scale",
      title: "BUILD & SCALE",
      subtitle: "Shipping AI in Production",
      description:
        "I build the systems behind it: APIs, data, voice/real-time, and full-stack products—production-ready, not slide decks.",
      tags: [
        "Node.js",
        "Python",
        "REST & real-time APIs",
        "PostgreSQL",
        "MongoDB",
        "React",
        "Cloud & infra",
      ],
    },
  ],

  career: [
    {
      id: "siliqo",
      title: "Siliqo — Agentic Customer Support API",
      role: "Solo Builder",
      when: "NOW",
      description:
        "Built a multi-tenant SaaS backend (7,400+ LOC, 38 endpoints, 68 passing tests) powering an embeddable AI support widget — RAG on PostgreSQL + pgvector, agentic tool-calling, provider-agnostic LLM abstraction across OpenAI, Anthropic, and Google.",
      projectId: "siliqo",
    },
    {
      id: "vayris",
      title: "Vayris",
      role: "Open-Source AI Agent, Independent Builder",
      when: "Ongoing",
      description:
        "Building a local-first, agentic AI assistant for Windows with a tri-path routing architecture (deterministic, fast-LLM, and deep-LLM reasoning) sharing a unified tool registry.",
      projectId: "vayris",
    },
    {
      id: "ordo",
      title: "Ordo",
      role: "Founder & Developer",
      when: "2025",
      description:
        "Founded and lead development of a hyperlocal quick-commerce platform connecting retailers, customers, and delivery partners — secure REST APIs, real-time order tracking, and a React Native app.",
      projectId: "ordo",
    },
    {
      id: "problem-solving",
      title: "Problem Solving",
      role: "DSA & Logic",
      when: "Ongoing",
      description:
        "Actively solving algorithmic problems to improve thinking, efficiency, and system-level understanding.",
    },
  ],

  projects: [
    {
      id: "siliqo",
      title: "Siliqo",
      category: "Agentic Customer Support API Platform",
      stack: ["Python", "PostgreSQL + pgvector", "RAG", "Multi-tenant SaaS"],
      image: "/images/siliqo-cover.webp",
      alt: "Siliqo cover — “Agentic AI customer support, as an API”, with RAG on pgvector, tool-calling and human handoff, and figures for lines of backend, API endpoints and passing tests.",
      link: "https://siliqo-beta.vercel.app/",
      status: "live",
      period: "Sep 2026 - Present",
      role: "Solo builder",
      highlights: [
        "Architected a multi-tenant backend (7,400+ LOC, 38 endpoints, 68 passing tests) powering an embeddable AI support widget with RAG, agentic tool-calling, and automatic human escalation.",
        "Built a provider-agnostic LLM abstraction layer unifying OpenAI, Anthropic, and Google behind a single streaming interface, so switching providers is a configuration change.",
        "Designed a two-key API authentication model (domain-locked public key plus secret key) modeled on Stripe and Razorpay, with AES-256-GCM credential encryption using versioned, tenant-bound keys.",
        "Built the RAG pipeline on PostgreSQL + pgvector with HNSW indexing, and agentic tool-calling through HMAC-signed webhooks with SSRF protection and a bounded execution loop.",
        "Shipped a zero-build JavaScript widget, verified with automated browser testing, streaming responses over REST and Server-Sent Events (SSE).",
      ],
    },
    {
      id: "vayris",
      title: "Vayris",
      category: "Open-Source AI Agent for Windows",
      stack: ["Electron", "React", "TypeScript", "Agentic Routing", "MCP"],
      image: "/images/vayris-cover.webp",
      alt: "Vayris cover — “An agent that never leaves your machine”, an open-source local-first desktop agent, with Zero-LLM, Fast LLM and Deep agentic LLM routing paths.",
      link: "https://vayris-website.vercel.app/",
      status: "live",
      period: "Aug 2026 - Present",
      role: "Independent builder",
      highlights: [
        "Built a locally run, open-source (Apache 2.0) multi-agent personal assistant that executes system-level operations through specialized planning and execution agents, written in Python with LLM APIs.",
        "Designed a tri-path routing architecture (a deterministic OS-command path, a lightweight conversational LLM, and deep agentic multi-step reasoning) sharing one unified tool registry, with MCP integration for extending capabilities.",
        "Integrated retrieval-augmented generation (RAG) to ground responses in local context, with guardrails that stop the agent taking unsafe or irreversible actions.",
        "Runs on either a user-supplied LLM API key or a fully local model, and ships as a monorepo with an Electron desktop client and a React web client.",
      ],
    },
    {
      id: "ordo",
      title: "Ordo",
      category: "Hyperlocal Quick-Commerce Platform",
      stack: ["Node.js", "React Native", "MongoDB", "REST APIs"],
      image: "/images/ordo-cover.webp",
      alt: "Ordo cover — “Groceries in five minutes”, hyperlocal quick-commerce for retailers, customers and riders, launching in Pune.",
      link: "https://ordo-website-two.vercel.app/",
      status: "in-development",
      period: "Jan 2025 - Present",
      role: "Founder & developer",
      highlights: [
        "Founded Ordo, a hyperlocal quick-commerce startup connecting local retailers, customers, and delivery partners, launching in Pune, and leads its architecture and full-stack development.",
        "Building secure REST APIs for authentication, order management, and inventory operations, validated with Postman.",
        "Building backend workflows for order processing and delivery tracking, and a React Native app with real-time order status updates.",
      ],
    },
    {
      id: "cloudtasks",
      title: "CloudTasks",
      category: "Learning Project — Task Tracker on an Azure Linux VM",
      stack: [
        "FastAPI",
        "SQLite",
        "Docker",
        "Caddy",
        "Azure",
        "OpenTofu",
        "Cloudflare DNS",
      ],
      image: "/images/cloudtasks-tasks.webp",
      link: "https://tasks.devanshlamba.in",
      alt: "CloudTasks task board in dark mode, signed in as the read-only demo account, showing colour-coded task cards and a Tasks / VM status switcher.",
      status: "learning",
      summary:
        "A college PBL experiment: a task tracker with a pastel UI and a live VM status panel, running 24/7 on a small Arm Linux VM in Azure and covered by 41 automated tests.",
      learned: [
        "Provisioning a small Arm Linux VM on Azure with OpenTofu and CLI scripts — NSG rules, a static public IP, and keeping it inside student credit",
        "Packaging the app with Docker and keeping it on an internal network behind Caddy",
        "Automatic HTTPS from Let's Encrypt, with a custom domain pointed through Cloudflare DNS",
        "Authentication basics — argon2id hashes, server-side sessions, CSRF tokens, rate limiting, and a read-only demo account",
      ],
      limits:
        "A learning build, not production: one small VM, SQLite, no autoscaling and no high availability.",
      // Read-only demo login, shown on the card on purpose. The account is
      // read-only and the password is public; set it back to
      // DEMO_PASSWORD_PLACEHOLDER to hide the credentials line again.
      demo: { username: "demo", password: "123456789012" },
      links: [
        { label: "Live demo (login required)", href: "https://tasks.devanshlamba.in" },
        { label: "GitHub", href: "https://github.com/devanshlamba/azure-vm-deploy" },
      ],
    },
  ],

  skills: [
    {
      id: "languages",
      label: "Languages",
      core: true,
      items: ["Java", "JavaScript", "Python", "SQL"],
    },
    {
      id: "backend",
      label: "Backend & APIs",
      core: true,
      items: [
        "Spring Boot",
        "Node.js",
        "Express.js",
        "REST API Design",
        "Server-Sent Events (SSE)",
      ],
    },
    {
      id: "ai",
      label: "AI / ML",
      core: true,
      items: [
        "LLM APIs (OpenAI, Anthropic, Google)",
        "Retrieval-Augmented Generation (RAG)",
        "Multi-Agent Systems",
        "Prompt Engineering",
      ],
    },
    {
      id: "data-frontend",
      label: "Databases & Frontend",
      core: false,
      items: [
        "PostgreSQL",
        "pgvector",
        "MongoDB",
        "MySQL",
        "React.js",
        "React Native",
        "HTML",
        "CSS",
      ],
    },
    {
      id: "security-infra",
      label: "Security, Infra & Tools",
      core: false,
      items: [
        "AES-256 Encryption",
        "JWT Auth",
        "HMAC-Signed Webhooks",
        "Docker",
        "Git",
        "GitHub",
        "Postman",
        "Linux",
        "Render",
        "Vercel",
        "Supabase",
      ],
    },
  ],

  education: [
    {
      id: "bvcoe",
      institution: "Bharati Vidyapeeth College of Engineering",
      location: "Pune, Maharashtra",
      degree: "Bachelor of Technology in Computer Engineering",
      period: "Aug 2023 - Present",
      detail: "CGPA: 8.39/10",
    },
  ],

  certifications: [
    { id: "oracle-agentic-ai", name: "Agentic AI Fundamentals", issuer: "Oracle" },
    { id: "apna-dsa", name: "Data Structures & Algorithms", issuer: "Apna College" },
    {
      id: "fullstack-web",
      name: "Full Stack Web Development",
      issuer: "Chai aur Code / Udemy",
    },
  ],

  achievements: [
    {
      id: "leetcode",
      title: "200+ LeetCode problems",
      detail: "Solved 200+ problems focused on data structures and algorithms.",
    },
    {
      id: "open-source",
      title: "Open-source release",
      detail:
        "Created and released Vayris, a local multi-agent personal assistant, under the Apache 2.0 license.",
    },
    {
      id: "founder",
      title: "Founder of Ordo",
      detail:
        "Founded and leads development of Ordo, a hyperlocal quick-commerce startup connecting local retailers, customers, and delivery partners.",
    },
  ],

  contact: {
    // Rendered in the Contact section only. `private` keeps it out of the
    // assistant's index so it can't be scraped from a chat answer.
    phone: { display: "+91 7692968555", href: "tel:+917692968555", private: true },
    connect: {
      label: "LinkedIn — devanshlamba",
      href: "https://www.linkedin.com/in/devanshlamba/",
    },
    focus: [
      "Backend Systems, Automation & System Design",
      "Building real-world workflows and scalable systems",
    ],
    socials: [
      { id: "github", label: "GitHub", handle: "devanshlamba", href: "https://github.com/devanshlamba" },
      { id: "linkedin", label: "LinkedIn", handle: "devanshlamba", href: "https://www.linkedin.com/in/devanshlamba/" },
      { id: "x", label: "Twitter", handle: "devanshlamba", href: "https://x.com/devanshlamba" },
      { id: "youtube", label: "YouTube", handle: "@devanshlamba", href: "https://www.youtube.com/@devanshlamba" },
      { id: "instagram", label: "Instagram", handle: "dvnshlamba", href: "https://www.instagram.com/dvnshlamba/" },
    ],
  },

  // What the assistant's pitch and tour skills draw on. They pick facts from
  // the sections above; nothing here is new content.
  assistant: {
    pitches: {
      recruiter: {
        label: "Recruiter",
        projectIds: ["siliqo", "vayris", "ordo"],
        skillGroupIds: ["languages", "backend", "ai"],
        actions: ["resume", "linkedin", "match"],
      },
      engineer: {
        label: "Engineer",
        projectIds: ["siliqo", "vayris"],
        skillGroupIds: ["backend", "ai"],
        actions: ["github", "work", "project:vayris"],
      },
      founder: {
        label: "Founder",
        projectIds: ["ordo", "siliqo"],
        skillGroupIds: [],
        actions: ["linkedin", "project:ordo", "contact"],
      },
      browsing: {
        label: "Just browsing",
        projectIds: ["siliqo", "vayris", "ordo", "cloudtasks"],
        skillGroupIds: [],
        actions: ["tour", "work"],
      },
    },
    tour: [
      { id: "intro", targetId: "landingDiv", title: "Hello", kind: "intro" },
      { id: "about", targetId: "about", title: "About", kind: "about" },
      { id: "services", targetId: "whatido", title: "What I do", kind: "services" },
      { id: "career", targetId: "career", title: "Journey", kind: "career" },
      { id: "work", targetId: "work", title: "Work", kind: "work" },
      { id: "contact", targetId: "contact", title: "Contact", kind: "contact" },
    ],
  },
};

export default profile;
