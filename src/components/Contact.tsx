import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";
import { profile } from "../data/profile";

const { phone, connect, focus, socials } = profile.contact;

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>Contact</h3>

        <div className="contact-flex">
          {/* Connect */}
          <div className="contact-box">
            <h4>Phone</h4>
            <p>
              <a href={phone.href} data-cursor="disable">
                {phone.display}
              </a>
            </p>
            <h4>Connect</h4>
            <p>
              <a
                href={connect.href}
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
              >
                {connect.label}
              </a>
            </p>

            <h4>Focus</h4>
            {focus.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          {/* Social */}
          <div className="contact-box">
            <h4>Social</h4>

            {socials.map((social) => (
              <a
                key={social.id}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
                className="contact-social"
              >
                {social.label} <MdArrowOutward />
              </a>
            ))}
          </div>

          {/* Footer */}
          <div className="contact-box">
            <h2>
              Designed and Built by <br /> <span>{profile.name}</span>
            </h2>
            <h5>
              <MdCopyright /> 2026
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
