import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My journey <span>&</span>
          <br /> experience
        </h2>

        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>

          {/* Current */}
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Siliqo — Agentic Customer Support API</h4>
                <h5>Solo Builder</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Built a multi-tenant SaaS backend (7,400+ LOC, 38 endpoints, 68
              passing tests) powering an embeddable AI support widget — RAG on
              PostgreSQL + pgvector, agentic tool-calling, provider-agnostic LLM
              abstraction across OpenAI, Anthropic, and Google.
            </p>
          </div>

          {/* Vayris */}
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Vayris</h4>
                <h5>Open-Source AI Agent, Independent Builder</h5>
              </div>
              <h3>Ongoing</h3>
            </div>
            <p>
              Building a local-first, agentic AI assistant for Windows with a
              tri-path routing architecture (deterministic, fast-LLM, and
              deep-LLM reasoning) sharing a unified tool registry.
            </p>
          </div>

          {/* Startup */}
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Ordo</h4>
                <h5>Founder & Developer</h5>
              </div>
              <h3>2025</h3>
            </div>
            <p>
              Founded and lead development of a hyperlocal quick-commerce
              platform connecting retailers, customers, and delivery partners —
              secure REST APIs, real-time order tracking, and a React Native app.
            </p>
          </div>

          {/* Problem Solving */}
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Problem Solving</h4>
                <h5>DSA & Logic</h5>
              </div>
              <h3>Ongoing</h3>
            </div>
            <p>
              Actively solving algorithmic problems to improve thinking,
              efficiency, and system-level understanding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;