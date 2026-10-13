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

- `npm run resume`
  Rebuilds `public/resume.pdf` from the profile data (needs Chrome or Edge installed).

- `npm run cover -- <project id>`
  Renders a case-file cover for a project into `public/images/` (e.g. `npm run cover -- leadloop`).

- `npm run build:api`
  Bundles `server/chat.ts` into `api/chat.js` for Vercel.

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

**Privacy.** There is no phone number anywhere in the profile, and the displayed email (`contact.email`) and project demo credentials are never indexed. Email addresses and phone-like digit runs are redacted from everything the assistant can show: indexed facts, answers, pitches, tour text and tool output. Blank or placeholder links are skipped. `tests/assistant/privacy.test.ts` fails if a phone-like pattern or a telephone link shows up in any of those or in the site's rendered sources (components, profile, `index.html`, README, the preview card and public text files). API keys are pasted at runtime, held in memory only, and never stored. Don't hardcode a key anywhere in this repo; anything in frontend code is public.

> **Résumé.** `npm run resume` builds `resume/resume.html` from `src/data/profile.ts` and prints it to `public/resume.pdf` with a local Chrome or Edge, so the résumé always matches the site and never has a phone number. `resume` in `profile.ts` is the single value every résumé link comes from (the corner button, the assistant, the recruiter pitch, the palette and the `get_contact` tool); set it to `""` to hide them all. Re-run `npm run resume` after changing the profile. The old `public/Devansh_Lamba_Resume.pdf` contains a phone number and is no longer linked, but it is still served at its URL while it sits in `public/`.

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

### "Leave a response" form

Visitors leave their name, email, organisation, the role they're hiring for, a short message and their consent to be contacted back; no phone field. The form sits in the Contact section (`src/components/ResponseForm/`) and opens from the navbar's RESPOND link, the Contact section's call-to-action, the command palette, the last tour stop, every pitch, and the button under assistant answers about getting in touch.

Responses go to `api/contact.ts`, a Vercel Function that validates them and emails them to you through [Resend](https://resend.com) with reply-to set to the visitor, so you answer straight from your inbox. Abuse protection: a honeypot field, a minimum fill time, length and size caps, HTML and control-character stripping, an optional origin allow-list, and per-client rate limiting (best-effort, per serverless instance; add a rate-limiting rule in Vercel's firewall or Cloudflare for a hard limit).

Settings live only in environment variables, never in the repo or the browser bundle. Copy `.env.example` to `.env.local` for local runs and set the same names in Vercel (Project → Settings → Environment Variables):

| Variable | What it is |
|---|---|
| `RESEND_API_KEY` | API key from Resend. |
| `CONTACT_TO_EMAIL` | Where responses are delivered. |
| `CONTACT_FROM_EMAIL` | The sender. Resend's `onboarding@resend.dev` only delivers to your own Resend account's email; for anything else verify `devanshlamba.in` in Resend (it adds DNS records you put in Cloudflare) and use an address on it. |
| `ALLOWED_ORIGINS` | Optional, e.g. `https://devanshlamba.in,https://www.devanshlamba.in`. Applies to both endpoints. |
| `GEMINI_API_KEY` | Google AI Studio key for the assistant's live answers (below). |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Optional. Default `gemini-flash-latest`, falling back to `gemini-3.1-flash-lite` when busy. |

Without `RESEND_API_KEY`, `npm run dev` and `npm run preview` run the form as a dry run (logged in the terminal, nothing sent), and production answers that the form isn't set up yet. `npm test` covers the endpoint with a fake email provider.

### Live answers with Gemini

Retrieval always runs in the browser. For grounded answers, the assistant then asks `/api/chat` to word the answer with Gemini. The endpoint (`server/chat.ts`, bundled into `api/chat.js` by `npm run build:api`) takes only the question, runs the same retrieval itself, and gives Gemini nothing but the top portfolio facts, so questions outside the portfolio never reach the model and the endpoint can't be used as a general chatbot. Answers must cite those facts, phone numbers and emails are redacted, and requests are size-capped and rate-limited. The key lives only in `GEMINI_API_KEY` on the server. If the key is missing, Gemini is busy, or anything fails, visitors get the offline answer instead, with no error shown.

After changing anything under `src/assistant/`, `src/data/profile.ts` or `server/`, run `npm run build:api` and commit `api/chat.js`; a test fails if the bundle is stale.

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
- [ ] *What is his phone number?*, *Can I call you?* and *Can I hire you?* point to the response form with a **Leave a response** button and never show a number.
- [ ] *Is Vayris open source?* mentions Apache 2.0 and the GitHub repo; *Is ORDO live?* says it isn't live yet; *Can I see the Siliqo code?* says the code is private and a walkthrough is available on request.
- [ ] *Does he know Kubernetes?* or *What's his favourite film?* gets an honest "couldn't find that" instead of a guess.
- [ ] Answers carry a VERIFIED stamp; the "couldn't find" answers carry NO RECORD.
- [ ] **How this was found** under an answer lists query terms, each retrieved fact's score and signals, and marks facts as used or dropped.
- [ ] While an answer is on its way the 3D character raises its eyebrows (visible when the character is on screen).
- [ ] **Job match**: paste a real job description. Required and nice-to-have skills are separated, each one is labelled Shipped / Core / Listed / Transferable / Gap with evidence, and a years-of-experience note appears if the posting asks for years.
- [ ] **Pitch me**: try Recruiter, Engineer, Founder and Just browsing. Each reads in about 30 seconds and its buttons work.
- [ ] **Tour**: the camera and page move to each section. → and ← step through the stops, Esc ends the tour, and Next on the last stop finishes it.
- [ ] **Ctrl+K / ⌘K** opens the palette: typing filters commands, arrow keys and Enter run one, and typing a question then picking "Ask" answers it in the panel.
- [ ] **Lab**: train the neural net on spirals until accuracy passes 95%; change chunk size and overlap in the RAG playground and watch the top match move; switch attention heads; step k-means to convergence; set regression to degree 11, press "Solve exactly", and see held-out error climb. Esc closes it. Keep an eye on the FPS readout while training.
- [ ] **Leave a response**: the navbar's RESPOND link and the Contact section's button scroll to the form and put the cursor in Name. Submitting it empty shows an error summary and marks each field; Tab, Space and Enter work throughout. With the dev server running and no key set, a valid response shows the RECEIVED stamp and a dry-run line in the terminal. Turn off the network in dev tools and submit: a RETURNED notice appears and nothing you typed is lost.
- [ ] With your Resend settings in `.env.local`, a response arrives in your inbox and replying goes to the visitor.
- [ ] The **RESUME** button opens `/resume.pdf`, which has no phone number.
- [ ] With `GEMINI_API_KEY` in `.env.local`, "How this was found" under an answer names Gemini as the generator; without it, it says offline and nothing else changes.
- [ ] *What is LeadLoop?*, *Is LeadLoop live?* and *Does LeadLoop have WhatsApp ordering?* describe it as in development, with WhatsApp ordering as planned.
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

The site is deployed on Vercel. The `api/` folder is picked up as Vercel Functions alongside the Vite build, so the response form works once its environment variables are set in the Vercel project (see "Leave a response" form above).

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
