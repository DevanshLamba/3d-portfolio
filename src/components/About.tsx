import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title">About Me</h3>
        <p className="para">
          I'm a backend engineer who builds systems that ship, not slideware.
          I designed and built Siliqo solo — a multi-tenant agentic customer
          support platform with 7,400+ lines of code, 38 API endpoints, and 68
          passing tests, running RAG on PostgreSQL + pgvector behind a
          provider-agnostic LLM layer across OpenAI, Anthropic, and Google.
          Right now I'm building Vayris, an open-source local-first AI agent
          for Windows, and I founded Ordo, a hyperlocal quick-commerce
          platform, taking it from an idea to real APIs and a live mobile app.
          What I care about: architecture that holds up under real usage,
          automation that removes grunt work, and code that's still readable a
          year later. Outside engineering, I document the process — currently
          at 1K+ subscribers across platforms.
        </p>
      </div>
    </div>
  );
};

export default About;