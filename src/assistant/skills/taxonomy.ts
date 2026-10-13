// Skill vocabulary for the job matcher. Each entry says how job descriptions
// name a skill (`aliases`), what else counts as proof of it in the profile
// (`evidence`), and which neighbouring skills make it transferable rather
// than a gap (`related`).
//
// Aliases are lowercase regex sources matched case-insensitively between
// word boundaries that understand "c++", "node.js" and "ci/cd". `exact`
// patterns are case-sensitive, for names that collide with English ("Go").

export type SkillFamily =
  | "Languages"
  | "Backend"
  | "Frontend"
  | "Mobile"
  | "Data"
  | "AI"
  | "Cloud"
  | "DevOps"
  | "Security"
  | "Testing"
  | "Practices";

export interface SkillDef {
  id: string;
  label: string;
  family: SkillFamily;
  aliases: string[];
  exact?: string[];
  evidence?: string[];
  related?: string[];
}

export const SKILLS: SkillDef[] = [
  // Languages
  { id: "python", label: "Python", family: "Languages", aliases: ["python", "python3"], related: ["javascript"] },
  { id: "java", label: "Java", family: "Languages", aliases: ["java", "jvm"], related: ["kotlin", "csharp"] },
  { id: "javascript", label: "JavaScript", family: "Languages", aliases: ["javascript", "ecmascript", "es6", "vanilla js"], exact: ["JS"], related: ["typescript"] },
  { id: "typescript", label: "TypeScript", family: "Languages", aliases: ["typescript"], exact: ["TS"], related: ["javascript"] },
  { id: "sql", label: "SQL", family: "Languages", aliases: ["sql", "t-sql", "pl/pgsql"], evidence: ["postgresql", "mysql", "sqlite"] },
  { id: "go", label: "Go", family: "Languages", aliases: ["golang"], exact: ["Go"], related: ["python", "java"] },
  { id: "rust", label: "Rust", family: "Languages", aliases: ["rust"] },
  { id: "cpp", label: "C++", family: "Languages", aliases: ["c\\+\\+", "cpp"], related: ["java"] },
  { id: "csharp", label: "C# / .NET", family: "Languages", aliases: ["c#", "\\.net", "dotnet", "asp\\.net"], related: ["java"] },
  { id: "kotlin", label: "Kotlin", family: "Languages", aliases: ["kotlin"], related: ["java"] },
  { id: "php", label: "PHP", family: "Languages", aliases: ["php", "laravel"] },
  { id: "ruby", label: "Ruby", family: "Languages", aliases: ["ruby", "rails", "ruby on rails"] },

  // Backend
  { id: "nodejs", label: "Node.js", family: "Backend", aliases: ["node(?:\\.?js)?"], related: ["javascript"] },
  { id: "express", label: "Express", family: "Backend", aliases: ["express\\.?js", "express framework"], exact: ["Express"], related: ["nodejs"] },
  { id: "spring", label: "Spring Boot", family: "Backend", aliases: ["spring boot", "spring framework", "spring"], related: ["java"] },
  { id: "fastapi", label: "FastAPI", family: "Backend", aliases: ["fastapi"], related: ["python", "django", "flask"] },
  { id: "django", label: "Django", family: "Backend", aliases: ["django"], related: ["fastapi", "python"] },
  { id: "flask", label: "Flask", family: "Backend", aliases: ["flask"], related: ["fastapi", "python"] },
  { id: "rest", label: "REST APIs", family: "Backend", aliases: ["rest(?:ful)?(?:[\\s-]*apis?)", "restful", "rest services?", "rest endpoints?", "api design", "api development", "web apis?", "http apis?"], evidence: ["endpoints", "rest/sse"] },
  { id: "graphql", label: "GraphQL", family: "Backend", aliases: ["graphql", "apollo"], related: ["rest"] },
  { id: "grpc", label: "gRPC", family: "Backend", aliases: ["grpc", "protobuf", "protocol buffers"], related: ["rest"] },
  { id: "sse", label: "Streaming (SSE)", family: "Backend", aliases: ["server[- ]sent events", "sse", "streaming apis?", "streaming responses?"], evidence: ["streaming"] },
  { id: "realtime", label: "Real-time / WebSockets", family: "Backend", aliases: ["web ?sockets?", "socket\\.io", "real[- ]time"], related: ["sse"] },
  { id: "microservices", label: "Microservices", family: "Backend", aliases: ["micro[- ]?services?", "service[- ]oriented architecture", "soa"], related: ["rest", "docker"] },
  { id: "webhooks", label: "Webhooks & integrations", family: "Backend", aliases: ["webhooks?", "third[- ]party integrations?", "api integrations?"], evidence: ["integrations"] },
  { id: "queues", label: "Message queues", family: "Backend", aliases: ["message queues?", "message brokers?", "kafka", "rabbitmq", "sqs", "pub ?/ ?sub", "celery", "event[- ]driven"], related: ["webhooks"] },

  // Frontend
  { id: "react", label: "React", family: "Frontend", aliases: ["react(?:\\.?js)?(?![\\s-]*native)"], related: ["reactnative", "vue"] },
  { id: "nextjs", label: "Next.js", family: "Frontend", aliases: ["next\\.?js"], related: ["react"] },
  { id: "vue", label: "Vue", family: "Frontend", aliases: ["vue(?:\\.?js)?", "nuxt"], related: ["react"] },
  { id: "angular", label: "Angular", family: "Frontend", aliases: ["angular(?:js)?"], related: ["react", "typescript"] },
  { id: "html", label: "HTML", family: "Frontend", aliases: ["html5?"] },
  { id: "css", label: "CSS", family: "Frontend", aliases: ["css3?", "tailwind(?:\\s?css)?", "sass", "scss"] },
  { id: "electron", label: "Electron / desktop", family: "Frontend", aliases: ["electron", "desktop apps?", "tauri"], related: ["react", "nodejs"] },

  // Mobile
  { id: "reactnative", label: "React Native", family: "Mobile", aliases: ["react[- ]native", "expo"], related: ["react"] },
  { id: "flutter", label: "Flutter", family: "Mobile", aliases: ["flutter", "dart"], related: ["reactnative"] },
  { id: "ios", label: "iOS / Swift", family: "Mobile", aliases: ["ios", "swift", "swiftui"], related: ["reactnative"] },
  { id: "android", label: "Android", family: "Mobile", aliases: ["android", "jetpack compose"], related: ["reactnative", "kotlin"] },

  // Data
  { id: "postgresql", label: "PostgreSQL", family: "Data", aliases: ["postgres(?:ql)?", "psql"], related: ["mysql", "sql"] },
  { id: "mysql", label: "MySQL", family: "Data", aliases: ["mysql", "mariadb"], related: ["postgresql"] },
  { id: "mongodb", label: "MongoDB", family: "Data", aliases: ["mongo(?:db)?", "mongoose"], related: ["nosql"] },
  { id: "nosql", label: "NoSQL", family: "Data", aliases: ["nosql", "document (?:stores?|databases?)", "dynamodb", "firestore", "cassandra"], evidence: ["mongodb"], related: ["mongodb"] },
  { id: "sqlite", label: "SQLite", family: "Data", aliases: ["sqlite"], related: ["postgresql"] },
  { id: "redis", label: "Redis / caching", family: "Data", aliases: ["redis", "memcached", "caching"], related: ["postgresql"] },
  { id: "vectordb", label: "Vector databases", family: "Data", aliases: ["vector (?:databases?|dbs?|stores?|search|indexes?)", "pgvector", "hnsw", "ann search"], evidence: ["pgvector"] },
  { id: "vector-saas", label: "Managed vector DBs (Pinecone etc.)", family: "Data", aliases: ["pinecone", "weaviate", "qdrant", "milvus", "chroma(?:db)?", "faiss"], related: ["vectordb"] },
  { id: "datamodel", label: "Data modelling", family: "Data", aliases: ["data model(?:l)?ing", "schema design", "database design"], related: ["postgresql", "mongodb"] },
  { id: "warehouse", label: "Data warehousing / ETL", family: "Data", aliases: ["etl", "elt", "data pipelines?", "snowflake", "bigquery", "airflow", "dbt", "spark"], related: ["sql"] },

  // AI
  { id: "llm", label: "LLMs & LLM APIs", family: "AI", aliases: ["llms?", "large language models?", "gen(?:erative)?[- ]?ai", "gpt[- ]?\\d*", "openai", "anthropic", "claude", "gemini", "llm apis?", "foundation models?"] },
  { id: "rag", label: "RAG / retrieval", family: "AI", aliases: ["rag", "retrieval[- ]augmented(?: generation)?", "retrieval pipelines?", "semantic search", "grounding"], related: ["llm", "vectordb"] },
  { id: "agents", label: "AI agents & tool calling", family: "AI", aliases: ["ai agents?", "llm agents?", "agentic", "multi[- ]agent", "tool[- ]calling", "function[- ]calling", "autonomous agents?", "agent frameworks?"], evidence: ["agents?", "tool registry"], related: ["llm"] },
  { id: "prompting", label: "Prompt engineering", family: "AI", aliases: ["prompt engineering", "prompt design", "prompting"], related: ["llm"] },
  { id: "mcp", label: "Model Context Protocol", family: "AI", aliases: ["mcp", "model context protocol"], related: ["agents"] },
  { id: "llm-frameworks", label: "LangChain / LlamaIndex", family: "AI", aliases: ["langchain", "langgraph", "llama ?index", "crewai", "autogen", "semantic kernel"], related: ["agents", "rag"] },
  { id: "embeddings", label: "Embeddings", family: "AI", aliases: ["embeddings?", "vector embeddings?", "sentence transformers?"], evidence: ["pgvector"], related: ["rag"] },
  { id: "evals", label: "Evals & guardrails", family: "AI", aliases: ["evals?", "llm evaluations?", "model evaluations?", "guardrails?", "red[- ]teaming"], related: ["llm"] },
  { id: "ml", label: "Machine learning", family: "AI", aliases: ["machine learning", "ml", "scikit[- ]learn", "sklearn", "classical ml"], related: ["llm", "rag"] },
  { id: "deep-learning", label: "Deep learning / model training", family: "AI", aliases: ["deep learning", "pytorch", "tensorflow", "keras", "neural networks?", "model training", "fine[- ]tun(?:e|ing)", "lora", "rlhf"] },
  { id: "nlp", label: "NLP", family: "AI", aliases: ["nlp", "natural language processing", "text classification"], related: ["llm", "rag"] },
  { id: "voice", label: "Voice AI", family: "AI", aliases: ["voice (?:ai|agents?|bots?)", "speech[- ]to[- ]text", "text[- ]to[- ]speech", "asr", "tts"], evidence: ["voice"], related: ["realtime"] },

  // Cloud
  { id: "aws", label: "AWS", family: "Cloud", aliases: ["aws", "amazon web services", "ec2", "s3", "aws lambda", "ecs", "rds"], related: ["azure", "gcp"] },
  { id: "azure", label: "Azure", family: "Cloud", aliases: ["azure"], related: ["aws", "gcp"] },
  { id: "gcp", label: "Google Cloud", family: "Cloud", aliases: ["gcp", "google cloud(?: platform)?", "cloud run"], related: ["aws", "azure"] },
  { id: "paas", label: "Vercel / Render / Supabase", family: "Cloud", aliases: ["vercel", "netlify", "supabase", "heroku", "render\\.com", "firebase"] },
  { id: "serverless", label: "Serverless", family: "Cloud", aliases: ["serverless", "lambda functions?", "cloud functions", "edge functions"], related: ["paas", "aws"] },
  { id: "cloudflare", label: "Cloudflare / DNS", family: "Cloud", aliases: ["cloudflare", "dns", "cdn"] },

  // DevOps
  { id: "docker", label: "Docker / containers", family: "DevOps", aliases: ["docker", "containers?", "containeri[sz]ation", "docker compose"] },
  { id: "kubernetes", label: "Kubernetes", family: "DevOps", aliases: ["kubernetes", "k8s", "helm", "eks", "gke", "aks"], related: ["docker"] },
  { id: "cicd", label: "CI/CD", family: "DevOps", aliases: ["ci ?/ ?cd", "continuous (?:integration|delivery|deployment)", "github actions", "gitlab ci", "jenkins", "circleci"], related: ["git", "docker", "testing"] },
  { id: "iac", label: "Infrastructure as code", family: "DevOps", aliases: ["terraform", "opentofu", "infrastructure as code", "iac", "pulumi", "cloudformation", "ansible"] },
  { id: "linux", label: "Linux", family: "DevOps", aliases: ["linux", "unix", "bash", "shell scripting"] },
  { id: "git", label: "Git", family: "DevOps", aliases: ["git", "github", "gitlab", "version control"] },
  { id: "proxy", label: "Reverse proxies / load balancing", family: "DevOps", aliases: ["nginx", "caddy", "reverse prox(?:y|ies)", "load balanc(?:er|ers|ing)", "https", "tls termination"], evidence: ["let's encrypt"] },
  { id: "observability", label: "Monitoring & observability", family: "DevOps", aliases: ["monitoring", "observability", "prometheus", "grafana", "datadog", "opentelemetry", "sentry", "logging"], related: ["linux"] },

  // Security
  { id: "auth", label: "Authentication & authorisation", family: "Security", aliases: ["authentication", "authori[sz]ation", "oauth ?2?", "jwt", "sso", "openid connect", "auth"], evidence: ["api keys?", "argon2id", "sessions", "two-key"] },
  { id: "encryption", label: "Encryption", family: "Security", aliases: ["encryption", "aes(?:-256)?", "cryptograph(?:y|ic)", "key management", "kms"] },
  { id: "appsec", label: "Application security", family: "Security", aliases: ["application security", "appsec", "owasp", "secure coding", "ssrf", "csrf", "xss", "security best practices"], evidence: ["rate limiting", "hmac"] },

  // Testing
  { id: "testing", label: "Automated testing", family: "Testing", aliases: ["unit tests?", "unit testing", "automated tests?", "automated testing", "test[- ]driven", "tdd", "pytest", "jest", "vitest", "integration tests?", "end[- ]to[- ]end tests?", "e2e", "testing"], evidence: ["passing tests", "browser testing"] },
  { id: "api-testing", label: "API testing (Postman)", family: "Testing", aliases: ["postman", "api testing", "insomnia"] },

  // Practices
  { id: "system-design", label: "System design & architecture", family: "Practices", aliases: ["system design", "distributed systems?", "scalab(?:le|ility)", "software architecture", "backend architecture", "high[- ]level design"], evidence: ["architected", "architecture"] },
  { id: "saas", label: "Multi-tenant SaaS", family: "Practices", aliases: ["multi[- ]tenan(?:t|cy)", "saas", "b2b platforms?"] },
  { id: "dsa", label: "Data structures & algorithms", family: "Practices", aliases: ["data structures", "algorithms", "dsa", "leetcode", "problem[- ]solving", "competitive programming"] },
  { id: "automation", label: "Workflow automation", family: "Practices", aliases: ["workflow automation", "automation", "automate", "business process automation", "rpa", "n8n", "zapier"] },
  { id: "product", label: "Product & startup ownership", family: "Practices", aliases: ["product (?:sense|thinking|strategy|mindset)", "end[- ]to[- ]end ownership", "ownership", "founder(?:'s)? mindset", "zero[- ]to[- ]one", "0 ?(?:to|->) ?1", "startup experience", "early[- ]stage"], evidence: ["founded", "founder", "solo"] },
  { id: "leadership", label: "Technical leadership", family: "Practices", aliases: ["technical leadership", "team lead", "lead (?:a )?team", "mentor(?:ing|ship)?", "leadership"], evidence: ["leads? (?:its )?(?:architecture|development)"] },
  { id: "open-source", label: "Open source", family: "Practices", aliases: ["open[- ]source", "oss contributions?"] },
  { id: "communication", label: "Communication & writing", family: "Practices", aliases: ["communication skills", "written communication", "technical writing", "documentation", "excellent communication"], evidence: ["document the process"] },
];

export const SKILLS_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

const LEFT = "(?:^|[^a-z0-9+#.])";
const RIGHT = "(?![a-z0-9+#])";

export interface CompiledSkill extends SkillDef {
  /** Matches how a job description names the skill. */
  jd: RegExp[];
  /** Matches proof in the profile: aliases plus extra evidence terms. */
  proof: RegExp[];
}

function compile(sources: string[], flags: string): RegExp[] {
  return sources.map((src) => new RegExp(`${LEFT}(?:${src})${RIGHT}`, flags));
}

export const COMPILED_SKILLS: CompiledSkill[] = SKILLS.map((s) => {
  const exact = s.exact ?? [];
  const jd = [...compile(s.aliases, "i"), ...exact.map((e) => new RegExp(`(?:^|[^A-Za-z0-9+#.])${e}(?![A-Za-z0-9+#])`))];
  return {
    ...s,
    jd,
    proof: [...jd, ...compile(s.evidence ?? [], "i")],
  };
});

export function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

/** Every taxonomy skill mentioned in a piece of text, in first-seen order. */
export function findSkills(text: string): CompiledSkill[] {
  return COMPILED_SKILLS.filter((s) => matchesAny(s.jd, text));
}
