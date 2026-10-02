import { useState, useCallback, useLayoutEffect, useRef } from "react";
import "./styles/Work.css";
import WorkImage from "./WorkImage";
import { MdArrowBack, MdArrowForward, MdArrowOutward } from "react-icons/md";

// Read-only demo login for CloudTasks. Replace the placeholder with the real
// password — nothing else needs to change. While it is still the placeholder
// the credentials line is left off the card rather than published as-is.
const DEMO_PASSWORD_PLACEHOLDER = "DEMO_PASSWORD_HERE";
const CLOUDTASKS_DEMO_PASSWORD = DEMO_PASSWORD_PLACEHOLDER;

interface Project {
  title: string;
  category: string;
  tools: string;
  image: string;
  link: string;
  alt?: string;
  /** Optional long-form fields — only CloudTasks uses these so far. */
  summary?: string;
  learned?: string[];
  limits?: string;
  demo?: { username: string; password: string };
  links?: { label: string; href: string }[];
}

const projects: Project[] = [
  {
    title: "Siliqo",
    category: "Agentic Customer Support API Platform",
    tools: "Python, PostgreSQL + pgvector, RAG, Multi-tenant SaaS",
    image: "/images/siliqo-dashboard.png",
    link: "https://siliqo-beta.vercel.app/",
  },
  {
    title: "Vayris",
    category: "Open-Source AI Agent for Windows",
    tools: "Electron, React, TypeScript, Agentic Routing, MCP",
    image: "/images/vayris-app.png",
    link: "https://vayris-website.vercel.app/",
  },
  {
    title: "Ordo",
    category: "Hyperlocal Quick-Commerce Platform",
    tools: "Node.js, React Native, MongoDB, REST APIs",
    image: "/images/ordo-logo.jpg",
    link: "https://ordo-website-two.vercel.app/",
  },
  {
    title: "CloudTasks",
    category: "Learning Project — Task Tracker on an Azure Linux VM",
    tools: "FastAPI, SQLite, Docker, Caddy, Azure, OpenTofu, Cloudflare DNS",
    image: "/images/cloudtasks-tasks.webp",
    link: "https://tasks.devanshlamba.in",
    alt: "CloudTasks task board in dark mode, signed in as the read-only demo account, showing colour-coded task cards and a Tasks / VM status switcher.",
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
    demo: { username: "demo", password: CLOUDTASKS_DEMO_PASSWORD },
    links: [
      { label: "Live demo (login required)", href: "https://tasks.devanshlamba.in" },
      { label: "GitHub", href: "https://github.com/devanshlamba/azure-vm-deploy" },
    ],
  },
];

const Work = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [trackHeight, setTrackHeight] = useState<number>();

  // Slides differ in height, so size the viewport to the active one instead of
  // letting the tallest slide pad out all the others.
  useLayoutEffect(() => {
    const slide = slideRefs.current[currentIndex];
    if (!slide) return;

    const measure = () => setTrackHeight(slide.offsetHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(slide);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [currentIndex]);

  // ScrollSmoother is created with autoResize, so it picks up the height change
  // on its own — calling ScrollTrigger.refresh() here would reset scroll.

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [isAnimating]
  );

  const goToPrev = useCallback(() => {
    const newIndex =
      currentIndex === 0 ? projects.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    const newIndex =
      currentIndex === projects.length - 1 ? 0 : currentIndex + 1;
    goToSlide(newIndex);
  }, [currentIndex, goToSlide]);

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>

        <div className="carousel-wrapper">
          {/* Navigation Arrows */}
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={goToPrev}
            aria-label="Previous project"
            data-cursor="disable"
          >
            <MdArrowBack />
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={goToNext}
            aria-label="Next project"
            data-cursor="disable"
          >
            <MdArrowForward />
          </button>

          {/* Slides */}
          <div
            className="carousel-track-container"
            style={trackHeight ? { height: trackHeight } : undefined}
          >
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {projects.map((project, index) => (
                <div
                  className="carousel-slide"
                  key={index}
                  ref={(el) => (slideRefs.current[index] = el)}
                >
                  <div className="carousel-content">
                    <div className="carousel-info">
                      <div className="carousel-number">
                        <h3>0{index + 1}</h3>
                      </div>
                      <div className="carousel-details">
                        <h4>{project.title}</h4>
                        <p className="carousel-category">
                          {project.category}
                        </p>
                        {project.summary && (
                          <p className="carousel-summary">{project.summary}</p>
                        )}
                        <div className="carousel-tools">
                          <span className="tools-label">Tools & Features</span>
                          <p>{project.tools}</p>
                        </div>
                        {project.learned && (
                          <div className="carousel-learned">
                            <span className="tools-label">What I Learned</span>
                            <ul>
                              {project.learned.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {project.limits && (
                          <p className="carousel-limits">{project.limits}</p>
                        )}
                        {project.links && (
                          <div className="carousel-links">
                            {project.links.map((item) => (
                              <a
                                key={item.href}
                                href={item.href}
                                target="_blank"
                                rel="noreferrer"
                                data-cursor="disable"
                              >
                                {item.label} <MdArrowOutward />
                              </a>
                            ))}
                          </div>
                        )}
                        {project.demo &&
                          project.demo.password !==
                            DEMO_PASSWORD_PLACEHOLDER && (
                          <p className="carousel-demo">
                            Demo account — {project.demo.username} /{" "}
                            {project.demo.password}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="carousel-image-wrapper">
                      <WorkImage
                        image={project.image}
                        alt={project.alt ?? project.title}
                        link={project.link}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="carousel-dots">
            {projects.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? "carousel-dot-active" : ""
                  }`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to project ${index + 1}`}
                data-cursor="disable"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Work;
