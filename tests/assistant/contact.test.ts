import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createAssistantCore } from "../../src/assistant/core.ts";
import { phoneLeaks } from "../helpers/phone.ts";

const core = createAssistantCore();

describe("assistant: getting in touch", () => {
  const questions = [
    "What is his phone number?",
    "Can I call you?",
    "Call me maybe? What's his mobile?",
    "How do I contact him?",
    "How can I reach Devansh?",
    "Can I hire you?",
    "How do I hire him for a role?",
  ];

  for (const q of questions) {
    test(q, () => {
      const result = core.ask(q);
      assert.equal(result.grounded, true, result.answer);
      assert.match(result.answer, /Leave a response/);
      assert.deepEqual(result.actions.map((a) => a.kind), ["respond"]);
      assert.deepEqual(phoneLeaks(result.answer), []);
    });
  }

  test("phone questions say a number isn't shared rather than guessing one", () => {
    const answer = core.ask("Give me his phone number").answer;
    assert.match(answer, /doesn't share a phone number/);
    assert.deepEqual(phoneLeaks(answer), []);
  });

  test("unrelated answers don't carry the form button", () => {
    assert.deepEqual(core.ask("What is Siliqo?").actions, []);
    assert.deepEqual(core.ask("hello").actions, []);
    const numbers = core.ask("What number of endpoints does Siliqo have?");
    assert.deepEqual(numbers.actions, []);
    assert.ok(!numbers.citations.some((c) => c.sourceId === "contact"));
  });

  test("the contact tool and agent point at the form first", () => {
    const contact = core.runTool("get_contact") as { preferred: { anchor: string } };
    assert.equal(contact.preferred.anchor, "#respond");
    assert.match(core.runAgent("How can I contact him?").answer, /Leave a response/);
  });
});

describe("assistant: project facts", () => {
  test("Vayris is open source, with its licence and repository", () => {
    const r = core.ask("Is Vayris open source?");
    assert.equal(r.grounded, true);
    assert.match(r.answer, /open source under the Apache 2\.0 license/);
    assert.match(r.answer, /github\.com\/DevanshLamba\/vayris-ai/);
  });

  test("ORDO isn't live yet", () => {
    const r = core.ask("Is ORDO live?");
    assert.equal(r.grounded, true);
    assert.match(r.answer, /Ordo is not live yet/);
  });

  test("Siliqo's code is private, with a walkthrough on request", () => {
    const r = core.ask("Can I see the Siliqo code?");
    assert.equal(r.grounded, true);
    assert.match(r.answer, /source code is private/);
    assert.match(r.answer, /walk you through/);
    assert.doesNotMatch(r.answer, /github\.com\/[^ ]*siliqo/i);
  });

  test("LeadLoop: what it is, that it isn't live, and planned work stays planned", () => {
    const what = core.ask("What is LeadLoop?");
    assert.equal(what.grounded, true);
    assert.match(what.answer, /Outsourced Digital Department for Restaurants|digital department for restaurants/i);
    assert.match(core.ask("Is LeadLoop live?").answer, /LeadLoop is not live yet/);
    const planned = core.ask("Does LeadLoop have WhatsApp ordering?").answer;
    assert.match(planned, /Planned for LeadLoop and not shipped yet/);
    assert.match(core.ask("Can I see the LeadLoop code?").answer, /source code is private/);
  });

  test("what he's looking for and where", () => {
    assert.match(core.ask("What kind of role is he looking for?").answer, /job or an internship/);
    const where = core.ask("Is he open to remote or Bangalore?").answer;
    assert.match(where, /Bangalore/);
    assert.match(core.ask("Where is he from?").answer, /Chhindwara/);
  });

  test("project tools report code visibility and deployment", () => {
    const vayris = core.runTool("get_project", { name: "Vayris" }) as { project: { code: string; license?: string } };
    assert.equal(vayris.project.code, "public");
    assert.equal(vayris.project.license, "Apache 2.0");
    const ordo = core.runTool("get_project", { name: "Ordo" }) as { project: { deployed: boolean; links: { label: string }[] } };
    assert.equal(ordo.project.deployed, false);
    assert.ok(!ordo.project.links.some((l) => /github/i.test(l.label)));
    const siliqo = core.runTool("get_project", { name: "Siliqo" }) as { project: { code: string; links: { label: string }[] } };
    assert.equal(siliqo.project.code, "private");
    assert.ok(!siliqo.project.links.some((l) => /github/i.test(l.label)));
  });
});
