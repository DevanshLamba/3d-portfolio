# 3D Portfolio Website

This repository contains the source code for a personal 3D portfolio built with React, TypeScript, Three.js, React Three Fiber, and GSAP. It includes animated page sections, a character scene, custom cursor interactions, and smooth transitions designed for a modern portfolio experience.

Live site: [https://akashrmalhotra.netlify.app/](https://akashrmalhotra.netlify.app/)

![Portfolio Preview](public/images/preview1.png)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [GSAP License Note](#gsap-license-note)
- [Customization Guide](#customization-guide)
- [Portfolio Assistant](#portfolio-assistant)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [License](#license)

## Features

- Responsive one-page portfolio layout with reusable section components.
- 3D character scene rendering powered by React Three Fiber and Three.js.
- GSAP-powered animations and transitions for interactive storytelling.
- Custom cursor, hover interactions, and scroll-driven visual effects.
- Organized component architecture with dedicated utilities and style modules.

## Tech Stack

### Core

- React 18
- TypeScript
- Vite

### Animation and 3D

- GSAP + `@gsap/react`
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/postprocessing`
- `@react-three/cannon`
- `@react-three/rapier`

### Supporting Libraries

- `react-icons`
- `react-fast-marquee`
- `@vercel/analytics`

## Project Structure

```text
.
├── public/                    # Static assets
├── src/
│   ├── assets/                # Local media/assets
│   ├── components/
│   │   ├── Character/         # 3D scene + character logic/utilities
│   │   ├── styles/            # Section/component CSS files
│   │   ├── About.tsx
│   │   ├── Career.tsx
│   │   ├── Contact.tsx
│   │   ├── Landing.tsx
│   │   ├── MainContainer.tsx  # Main page composition
│   │   ├── Navbar.tsx
│   │   ├── TechStack.tsx
│   │   ├── WhatIDo.tsx
│   │   └── Work.tsx
│   ├── context/               # Global providers (loading state, etc.)
│   ├── data/                  # Static data/content definitions
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (or compatible)

### Installation

1. Clone the repository:

   ```bash
   git clone <your-repository-url>
   cd 3d-portfolio
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open the URL shown in the terminal (typically `http://localhost:5173`).

## Available Scripts

- `npm run dev`  
  Starts Vite dev server and exposes host for local network testing.

- `npm run build`  
  Type-checks and builds a production-ready bundle.

- `npm run preview`  
  Serves the production build locally for verification.

- `npm run og`  
  Rebuilds the link-preview card from the profile data (needs Chrome or Edge installed).

- `npm run lint`  
  Runs ESLint checks across the project.

- `npm test`  
  Runs the assistant's tests with Node's built-in test runner.

## GSAP License Note

This project uses the standard `gsap` package, including bonus plugins now available in the core package.

- Install dependencies with `npm install`.
- If migrating from older setups, remove `gsap-trial` from your project.

Read official installation guidance here: [GSAP Installation Docs](https://gsap.com/docs/v3/Installation/)

## Customization Guide

You can adapt this portfolio to your own profile by updating the following areas:

- **Content**: Every fact on the page (about, services, career, projects, contact, plus résumé-only details like education and certifications) lives in `src/data/profile.ts`. The section components and the assistant both read from it, so edit it there only.
- **Section layout**: Edit files in `src/components/` such as `About.tsx`, `Career.tsx`, `WhatIDo.tsx`, and `Work.tsx`.
- **Styling**: Modify component styles in `src/components/styles/` and global styles in `src/index.css` / `src/App.css`.
- **3D scene behavior**: Adjust scene logic in `src/components/Character/` and related utilities.
- **Animations**: Tweak GSAP utilities under `src/components/utils/`.

## Portfolio Assistant

An in-browser assistant that answers questions about the portfolio with no API key and no network calls. Everything lives in `src/assistant/` and reads only from `src/data/profile.ts`.

- **Retrieval**: the profile is split into small tagged facts, indexed with TF-IDF and searched by cosine similarity, then reranked on exact-term coverage, tag hits, phrase adjacency and title hits.
- **Answers**: composed only from retrieved facts, with `[n]` citations. If nothing relevant is found, the assistant says so.
- **Skills**: a job matcher (Shipped / Core / Listed / Transferable / Gap, with evidence), audience pitches, and a guided tour.
- **Tools**: a registry with JSON schemas and a plan, act, observe loop that reports each step.
- **Inspector**: under each answer, "How this was found" shows the query terms (crossing out words the portfolio never mentions), each retrieved fact's score and rerank signals, and which facts were used or dropped.
- **Lab**: five from-scratch ML demos on a CRT-style screen: a neural network trainer with hand-written backprop, a RAG playground (your text, your chunk size and overlap), self-attention heatmaps, step-by-step k-means, and polynomial regression that shows overfitting. The maths lives in `src/lab/`.
- **Command palette**: Ctrl+K (⌘K on a Mac) jumps to sections, starts the tour, picks a pitch, opens a Lab demo or links, or asks whatever you type.
- **Character**: the 3D character raises its eyebrows while the assistant searches and types faster when an answer lands (no typing burst under reduced motion).
- **Performance**: the engine runs in a Web Worker that starts on the first question. The panel loads after the intro finishes, the Lab is its own chunk loaded on first open, and its training loops work in small per-frame time budgets.

```ts
import { getAssistant, createPresetProvider } from "./assistant";

const assistant = getAssistant();
await assistant.ask("What is Siliqo?");     // { answer, citations, retrieved, grounded, ... }
await assistant.matchJob(jobDescription);   // { score, verdict, rows, notes }
assistant.pitch("recruiter");               // recruiter | engineer | founder | browsing
assistant.tour.start();                     // emits start / stop / end
assistant.tour.on("stop", ({ stop }) => console.log(stop.targetId));
window.addEventListener("portfolio:tour", (e) => console.log(e.detail));

// Optional: only the wording step goes to the provider; retrieval stays local.
assistant.setProvider(createPresetProvider("groq", pastedKey));
```

The UI lives in `src/components/Assistant/`: `Assistant.css` and `Lab/Lab.css` hold its styles, and the logic is in `useAssistant`, `useSceneTour` and `src/assistant/`, so the components can be replaced without touching it. Tour stops call `navigateToSection()`, which scrolls through ScrollSmoother so the camera timelines follow, and jumps instead of animating under `prefers-reduced-motion`.

**Privacy.** `contact.phone` and project demo credentials are never indexed. Email addresses and phone-like digit runs are redacted from everything the assistant can show: indexed facts, answers, pitches, tour text and tool output. Blank or placeholder links are skipped. `tests/assistant/privacy.test.ts` fails if any of those values gets through. API keys are pasted at runtime, held in memory only, and never stored. Don't hardcode a key anywhere in this repo; anything in frontend code is public.

> **Before deploying: swap the résumé.** `public/Devansh_Lamba_Resume.pdf` includes a phone number. Every résumé link (the corner button, the assistant's contact answer, the recruiter pitch and the `get_contact` tool) comes from the single `resume` value in `src/data/profile.ts`. Add a phone-number-free PDF to `public/` and point `resume` at it, or set `resume` to `""` to hide all résumé links.

**Editing.** Add or change facts in `profile.ts` and the index, matcher, pitches and tour pick them up. Tour stops and per-audience pitch choices are under `profile.assistant`. The job matcher's skill vocabulary is in `src/assistant/skills/taxonomy.ts`.

To teach the assistant something the page doesn't say, add a note. Notes are indexed and cited like any other fact; tags help it find a note by words the note doesn't use:

```ts
notes: [
  {
    id: "looking-for",
    title: "What he's looking for",
    text: "Backend or AI-infrastructure internships, remote or in Pune.",
    tags: ["hiring", "role", "internship", "available", "opportunity"],
  },
],
```

**Theme.** The site's retro-office palette (paper, ink, amber, mint, rust) and the mono font are CSS variables at the top of `src/index.css`. The section styles, the assistant and the Lab all read them.

**Link preview.** `npm run og` rebuilds `og/card.html` from `profile.ts` and renders `public/og-image.png` with a locally installed Chrome or Edge (set `BROWSER_PATH` if it isn't found). Run it after changing your name, headline or lead project's numbers.

**Tests.** `npm test` runs the retrieval, job matcher, privacy, skills and Lab tests on Node's built-in test runner (Node 22.6+, no extra dependencies). The Lab tests check the backprop against numerical gradients, that the network learns two spirals, k-means recovery, overfitting at high polynomial degree, attention rows, and the chunker.

### Run and review locally

From a clean checkout (Node 22.6 or newer):

```bash
npm install
npm test           # assistant and Lab tests
npm run dev        # http://localhost:5173/
npm run build      # production build into dist/
npm run preview    # serves dist/ at http://localhost:4173/
```

`npm run dev` uses `--host`, so it also prints a network URL for testing on a phone. In dev only, a small readout under the logo shows frames per second and the slowest recent frame; production builds don't include it. Note that `npm run build` rewrites the tracked `tsconfig.*.tsbuildinfo` files.

Review checklist (run it on `npm run dev` to see the FPS readout, then once more on `npm run preview`):

- [ ] The **Ask about Devansh** button appears only after the intro finishes, and opening it doesn't visibly drop the FPS readout.
- [ ] *Where did he study?* gives the degree, college and CGPA, with a numbered source.
- [ ] *What is Siliqo?* answers with sources; clicking one scrolls to the Work section.
- [ ] *How does Siliqo handle API keys?* quotes the two-key authentication detail with a citation.
- [ ] *What has he built with React Native?* names Ordo.
- [ ] *What is his phone number?* says it isn't shared and shows no number.
- [ ] *Does he know Kubernetes?* or *What's his favourite film?* gets an honest "couldn't find that" instead of a guess.
- [ ] Answers carry a VERIFIED stamp; the "couldn't find" answers carry NO RECORD.
- [ ] **How this was found** under an answer lists query terms, each retrieved fact's score and signals, and marks facts as used or dropped.
- [ ] While an answer is on its way the 3D character raises its eyebrows (visible when the character is on screen).
- [ ] **Job match**: paste a real job description. Required and nice-to-have skills are separated, each one is labelled Shipped / Core / Listed / Transferable / Gap with evidence, and a years-of-experience note appears if the posting asks for years.
- [ ] **Pitch me**: try Recruiter, Engineer, Founder and Just browsing. Each reads in about 30 seconds and its buttons work.
- [ ] **Tour**: the camera and page move to each section. → and ← step through the stops, Esc ends the tour, and Next on the last stop finishes it.
- [ ] **Ctrl+K / ⌘K** opens the palette: typing filters commands, arrow keys and Enter run one, and typing a question then picking "Ask" answers it in the panel.
- [ ] **Lab**: train the neural net on spirals until accuracy passes 95%; change chunk size and overlap in the RAG playground and watch the top match move; switch attention heads; step k-means to convergence; set regression to degree 11, press "Solve exactly", and see held-out error climb. Esc closes it. Keep an eye on the FPS readout while training.
- [ ] On a phone-width window, the panel sits below the header, and the Lab and palette cover the page with no sideways scrolling.
- [ ] After `npm run og`, `public/og-image.png` shows your current name, headline and numbers.
- [ ] With reduced motion turned on in the OS, scrolling and tour stops land without easing.
- [ ] **Agent** mode: *Which projects use Python and how can I contact him?* shows plan, act and observe steps.

## Troubleshooting

- **Blank screen in development**  
  Check browser console for module import errors and verify all dependencies are installed.

- **3D performance issues on low-end devices**  
  Reduce scene complexity and post-processing effects in the character/scene utilities.

- **GSAP plugin errors**  
  Ensure you have the correct plugin package and license configuration for your target environment.

- **TypeScript build failures**  
  Run `npm run build` and address reported type errors before deploying.

## Deployment

1. Create a production build:

   ```bash
   npm run build
   ```

2. Validate locally:

   ```bash
   npm run preview
   ```

3. Deploy the generated `dist/` folder to your hosting provider (for example Vercel, Netlify, or Cloudflare Pages).

## License

This project is open source and available under the [MIT License](LICENSE).
