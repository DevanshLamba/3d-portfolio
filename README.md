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
- **Performance**: the engine runs in a Web Worker that starts on first use. The panel loads after the intro finishes.

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

The panel in `src/components/Assistant/` is a thin, mostly unstyled mount: restyle `Assistant.css` or replace the component and keep the hooks. Tour stops call `navigateToSection()`, which scrolls through ScrollSmoother so the camera timelines follow, and jumps instead of animating under `prefers-reduced-motion`.

**Privacy.** `contact.phone` and project demo credentials are never indexed, phone-like digit runs are redacted, and blank or placeholder links are skipped. API keys are pasted at runtime, held in memory only, and never stored. Don't hardcode a key anywhere in this repo; anything in frontend code is public.

**Editing.** Add or change facts in `profile.ts` and the index, matcher, pitches and tour pick them up. Tour stops and per-audience pitch choices are under `profile.assistant`. The job matcher's skill vocabulary is in `src/assistant/skills/taxonomy.ts`.

**Tests.** `npm test` runs the retrieval, job matcher, privacy and skills tests on Node's built-in test runner (Node 22.6+, no extra dependencies).

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
