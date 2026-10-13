import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import type { PitchAction } from "../../assistant";
import { isPlaceholder, profile } from "../../data/profile";
import CommandPalette, { type Command } from "./CommandPalette";
import { LAB_TABS, type LabTab } from "./Lab/tabs";
import Panel from "./Panel";
import { navigateToSection } from "./sceneNavigation";
import { PALETTE_SHORTCUT } from "./shortcut";
import TourCard from "./TourCard";
import { useAssistant, type Mode } from "./useAssistant";
import { useSceneTour } from "./useSceneTour";
import "./Assistant.css";

// The Lab's canvas demos are their own chunk, loaded the first time it opens.
const Lab = lazy(() => import("./Lab"));

const SECTIONS = [
  { id: "landingDiv", label: "Top" },
  { id: "about", label: "About" },
  { id: "whatido", label: "What I do" },
  { id: "career", label: "Journey" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

const openLink = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

const Assistant = () => {
  const chat = useAssistant();
  const { assistant } = chat;
  const tourState = useSceneTour(assistant.tour);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("ask");
  const [focusKey, setFocusKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [labTab, setLabTab] = useState<LabTab | null>(null);
  const panelId = useId();

  const openPanel = useCallback((nextMode?: Mode) => {
    setPanelOpen(true);
    if (nextMode) setMode(nextMode);
    setFocusKey((k) => k + 1);
  }, []);

  // End any tour when the assistant unmounts.
  useEffect(() => () => assistant.tour.end(), [assistant]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ask = useCallback(
    (question: string) => {
      openPanel("ask");
      chat.send(question, "ask");
    },
    [chat, openPanel]
  );

  const runAction = useCallback(
    (action: PitchAction) => {
      if (action.anchor) navigateToSection(action.anchor);
      if (action.skill === "tour") assistant.tour.start();
      if (action.skill === "match") openPanel("match");
    },
    [assistant, openPanel]
  );

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      { id: "open", group: "Assistant", label: "Open the assistant", keywords: "chat ask", run: () => openPanel() },
      { id: "match", group: "Assistant", label: "Match a job description", keywords: "jd hiring recruiter", run: () => openPanel("match") },
      { id: "agent", group: "Assistant", label: "Agent mode (show tool steps)", keywords: "tools plan", run: () => openPanel("agent") },
      { id: "tour", group: "Assistant", label: "Start the guided tour", keywords: "walkthrough", run: () => assistant.tour.start() },
      ...assistant.audiences.map((a) => ({
        id: `pitch-${a.id}`,
        group: "Pitch",
        label: `Pitch me: ${a.label}`,
        keywords: "summary intro",
        run: () => {
          openPanel();
          chat.pitch(a.id);
        },
      })),
      ...LAB_TABS.map((t) => ({ id: `lab-${t.id}`, group: "Lab", label: `Lab: ${t.label}`, keywords: "demo ml", run: () => setLabTab(t.id) })),
      ...SECTIONS.filter((s) => document.getElementById(s.id)).map((s) => ({
        id: `go-${s.id}`,
        group: "Go to",
        label: s.label,
        keywords: "section scroll jump",
        run: () => navigateToSection(s.id),
      })),
    ];
    if (!isPlaceholder(profile.resume)) list.push({ id: "resume", group: "Links", label: "Open résumé", keywords: "cv pdf", run: () => openLink(profile.resume) });
    for (const s of profile.contact.socials) {
      if (!isPlaceholder(s.href)) list.push({ id: `link-${s.id}`, group: "Links", label: `Open ${s.label}`, keywords: s.handle, run: () => openLink(s.href) });
    }
    return list;
    // Sections are looked up when the palette opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant, chat.pitch, openPanel, paletteOpen]);

  return (
    <div className="assistant-root">
      {tourState?.stop ? (
        <TourCard tour={assistant.tour} state={tourState} />
      ) : (
        panelOpen && (
          <Panel
            id={panelId}
            chat={chat}
            mode={mode}
            onModeChange={setMode}
            focusKey={focusKey}
            onClose={() => setPanelOpen(false)}
            onAction={runAction}
            onStartTour={() => assistant.tour.start()}
            onOpenLab={() => setLabTab("neural")}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        )
      )}

      <div className="assistant-dock">
        <button type="button" className="assistant-launcher" aria-expanded={panelOpen} aria-controls={panelId} onClick={() => (panelOpen ? setPanelOpen(false) : openPanel())}>
          {panelOpen ? "Close" : `Ask about ${profile.firstName}`}
        </button>
        <button type="button" className="assistant-launcher is-small" onClick={() => setPaletteOpen(true)} aria-label={`Open command palette (${PALETTE_SHORTCUT})`} title={`Command palette (${PALETTE_SHORTCUT})`}>
          {PALETTE_SHORTCUT}
        </button>
      </div>

      {paletteOpen && <CommandPalette commands={commands} onAsk={ask} onClose={() => setPaletteOpen(false)} />}

      {labTab && (
        <Suspense fallback={<div className="lab-loading">Warming up the lab…</div>}>
          <Lab tab={labTab} onTabChange={setLabTab} onClose={() => setLabTab(null)} />
        </Suspense>
      )}
    </div>
  );
};

export default Assistant;
