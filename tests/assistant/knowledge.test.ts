import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { profile, type ProfileData } from "../../src/data/profile.ts";
import { buildKnowledge } from "../../src/assistant/knowledge.ts";

const chunks = buildKnowledge(profile);

describe("knowledge base hygiene", () => {
  test("chunk ids are unique and every chunk is tagged and sourced", () => {
    const ids = new Set(chunks.map((c) => c.id));
    assert.equal(ids.size, chunks.length);
    for (const c of chunks) {
      assert.ok(c.sourceId, c.id);
      assert.ok(c.tags.length > 0, c.id);
      assert.ok(c.text.length > 0, c.id);
    }
  });

  test("blank and placeholder links are skipped, not indexed as dead links", () => {
    const edited: ProfileData = structuredClone(profile);
    edited.projects[0].link = "";
    edited.projects[3].links = [{ label: "GitHub", href: "TODO" }];
    edited.contact.socials[4].href = "#";
    edited.resume = "";
    const text = buildKnowledge(edited).map((c) => c.text).join("\n");

    assert.ok(!text.includes(`${edited.projects[0].title} Link:`));
    assert.ok(!/Link: \s*$/m.test(text));
    assert.ok(!text.includes("TODO"));
    assert.ok(!text.includes(`${edited.contact.socials[4].label} (#)`));
    assert.ok(!text.includes("résumé"));
  });
});

describe("notes", () => {
  test("notes are indexed, retrievable and cited; blank ones are skipped", async () => {
    const { createAssistantCore } = await import("../../src/assistant/core.ts");
    const p: ProfileData = structuredClone(profile);
    p.notes = [
      { id: "looking-for", title: "What he's looking for", text: "He is looking for backend internships focused on distributed systems.", tags: ["hiring", "role", "opportunity"] },
      { id: "empty", title: "Draft", text: "", tags: [] },
    ];
    assert.ok(buildKnowledge(p).some((c) => c.id === "note:looking-for:0"));
    assert.ok(!buildKnowledge(p).some((c) => c.sourceId === "note:empty"));
    const result = createAssistantCore(p).ask("What kind of role is he looking for?");
    assert.equal(result.citations[0]?.sourceId, "note:looking-for");
  });
});
