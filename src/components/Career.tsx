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
                <h4>Backend Systems & Automation</h4>
                <h5>Independent Builder</h5>
              </div>
              <h3>NOW</h3>
            </div>
            <p>
              Designing and building backend systems focused on automation,
              workflows, and real-world problem solving. Working on scalable
              architectures, APIs, and execution-focused systems.
            </p>
          </div>

          {/* Startup */}
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Ordo</h4>
                <h5>Startup (Private)</h5>
              </div>
              <h3>2025</h3>
            </div>
            <p>
              Working on backend-driven systems and workflow automation for
              real-world use cases. Focus on system design, execution, and
              building reliable infrastructure.
            </p>
          </div>

          {/* Projects */}
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Projects & Systems</h4>
                <h5>Self-driven</h5>
              </div>
              <h3>Ongoing</h3>
            </div>
            <p>
              Built applications like TunePlay and backend systems for marketplace
              platforms. Focused on APIs, system architecture, and practical
              implementation.
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