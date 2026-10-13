import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { PALETTE_SHORTCUT } from "./shortcut";

export interface Command {
  id: string;
  group: string;
  label: string;
  /** Extra words that should match, e.g. "cv" for the résumé. */
  keywords?: string;
  run: () => void;
}

interface Props {
  commands: Command[];
  onAsk: (question: string) => void;
  onClose: () => void;
}

/** Ctrl/Cmd+K launcher: filter commands, or type a question and press Enter to ask it. */
const CommandPalette = ({ commands, onAsk, onClose }: Props) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = words.length
      ? commands.filter((c) => {
          const hay = `${c.group} ${c.label} ${c.keywords ?? ""}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        })
      : commands;
    const ask: Command[] = query.trim() ? [{ id: "ask", group: "Ask", label: `Ask: “${query.trim()}”`, run: () => onAsk(query.trim()) }] : [];
    // A matching command is the likelier intent; asking stays one key away.
    return matches.length ? [...matches, ...ask] : ask;
  }, [commands, query, onAsk]);

  useEffect(() => setActive(0), [query]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = "";
  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input">
          <span aria-hidden="true">›</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section, run a demo, or ask a question…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" id={listId} role="listbox">
          {items.length === 0 && <li className="palette-empty">Type something to ask it.</li>}
          {items.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {header && <span className="palette-group">{header}</span>}
                <button
                  type="button"
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "is-active" : undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  {c.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="palette-foot">↑↓ to move · Enter to run · {PALETTE_SHORTCUT} to toggle</p>
      </div>
    </div>
  );
};

export default CommandPalette;
