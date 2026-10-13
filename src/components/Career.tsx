import "./styles/Career.css";
import { profile } from "../data/profile";

const Career = () => {
  return (
    <div className="career-section section-container" id="career">
      <div className="career-container">
        <h2>
          My journey <span>&</span>
          <br /> experience
        </h2>

        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>

          {profile.career.map((entry) => (
            <div className="career-info-box" key={entry.id}>
              <div className="career-info-in">
                <div className="career-role">
                  <h4>{entry.title}</h4>
                  <h5>{entry.role}</h5>
                </div>
                <h3>{entry.when}</h3>
              </div>
              <p>{entry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Career;
