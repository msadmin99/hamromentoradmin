import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countNetNew, mergeImportedQuestions } from "./examQuestionMerge.js";

// Phase C — covers the specific, explicit merge/dedup rule requested for
// Bulk Import Questions (Step 9/Step 14 items 5-7): "existing + imported,
// never replace, never duplicate, preserve order". Component
// rendering/interaction (button visibility, upload flow, the actual POST
// call, Save still PATCHing, fullscreen, permission-denied handling,
// unsaved-state confirmation) is covered by the staging browser
// validation instead — Admin has no jsdom/React Testing Library setup to
// render these components under `node --test`, and installing one wasn't
// in scope for this phase (see the Phase C report's Limitations section).

const q = (id, text = `Q${id}`) => ({ id, text });

describe("mergeImportedQuestions", () => {
  it("appends imported questions after the existing ones, in order (Step 14.7: existing questions remain)", () => {
    const existing = [q(1), q(2)];
    const imported = [q(10), q(11)];

    const result = mergeImportedQuestions(existing, imported);

    assert.deepEqual(result.map((x) => x.id), [1, 2, 10, 11]);
  });

  it("never drops or reorders an existing question", () => {
    const existing = [q(5), q(3), q(9)];
    const result = mergeImportedQuestions(existing, [q(20)]);
    assert.deepEqual(result.slice(0, 3).map((x) => x.id), [5, 3, 9]);
  });

  it("does not add a question whose id is already present (Step 14.6: duplicate IDs are not added)", () => {
    const existing = [q(1), q(2)];
    const imported = [q(2, "Q2 (skip resolved to the same existing question)"), q(3)];

    const result = mergeImportedQuestions(existing, imported);

    assert.deepEqual(result.map((x) => x.id), [1, 2, 3]);
    assert.equal(result.filter((x) => x.id === 2).length, 1);
  });

  it("re-importing the exact same file twice never produces duplicates", () => {
    const existing = [q(1)];
    const firstImport = mergeImportedQuestions(existing, [q(2), q(3)]);
    const secondImport = mergeImportedQuestions(firstImport, [q(2), q(3)]); // same batch, run again

    assert.deepEqual(secondImport.map((x) => x.id), [1, 2, 3]);
  });

  it("never replaces the list — an empty import result changes nothing", () => {
    const existing = [q(1), q(2)];
    const result = mergeImportedQuestions(existing, []);
    assert.deepEqual(result, existing);
  });

  it("starting from zero questions just becomes the imported list", () => {
    const result = mergeImportedQuestions([], [q(7), q(8)]);
    assert.deepEqual(result.map((x) => x.id), [7, 8]);
  });
});

describe("countNetNew", () => {
  it("counts only questions not already in the exam (Step 13: distinguishing creation from exam membership)", () => {
    const existing = [q(1), q(2)];
    assert.equal(countNetNew(existing, [q(2), q(3), q(4)]), 2);
  });

  it("is zero when every imported id is already present — a fully-skipped duplicate batch", () => {
    const existing = [q(1), q(2)];
    assert.equal(countNetNew(existing, [q(1), q(2)]), 0);
  });

  it("matches mergeImportedQuestions' own idea of what's net-new", () => {
    const existing = [q(1)];
    const imported = [q(1), q(2), q(3)];
    const merged = mergeImportedQuestions(existing, imported);
    assert.equal(merged.length - existing.length, countNetNew(existing, imported));
  });
});
