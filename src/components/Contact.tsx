import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";
import { profile } from "../data/profile";
import ResponseForm from "./ResponseForm";
import { openResponseForm, RESPONSE_FORM_ID } from "./ResponseForm/openResponseForm";

const { email, connect, focus, socials } = profile.contact;

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>Contact</h3>

        <ResponseForm />

        <div className="contact-flex">
          {/* Connect */}
          <div className="contact-box">
            <h4>Get in touch</h4>
            <p>
              <a
                href={`#${RESPONSE_FORM_ID}`}
                className="contact-cta"
                data-cursor="disable"
                onClick={(e) => {
                  e.preventDefault();
                  openResponseForm();
                }}
              >
                Leave a response <MdArrowOutward />
              </a>
            </p>
            <h4>Email</h4>
            <p>
              <a href={email.href} data-cursor="disable">
                {email.display}
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
