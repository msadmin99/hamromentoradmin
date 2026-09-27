/**
 * Bulk Import "Preview & Validate" — the real RowDetail component rendered into
 * a DOM. The TipTap editor is replaced by a stub that simply echoes the source
 * string it is given (into a <textarea>), so these tests can assert BOTH:
 *   - the editor still holds the untouched raw source (raw $…$ / \(…\) kept), and
 *   - the new read-only "Rendered preview" beside each editor shows what
 *     students will see.
 * Also covers the Skip / Delete wording and states.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const win = new JSDOM("<!doctype html><body></body>").window;
globalThis.window = win;
globalThis.document = win.document;
const { loadJsx } = await import("../../test-utils/loadJsx.mjs");

const { RowDetail } = await loadJsx("components/import/PreviewStep.js", {
  stubs: {
    "components/richeditor/RichEditor":
      'import React from "react"; export default function RichEditor({ value, placeholder }) { return React.createElement("textarea", { "data-editor": placeholder, readOnly: true, defaultValue: value ?? "" }); }',
    "lib/api": "export const api = {};",
  },
});

function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}
const opt = (text_html, is_correct = false) => ({ text_html, is_correct });
function makeRow(over = {}, data = {}) {
  return deepFreeze({
    id: 1, row_number: 1, status: "valid", errors: [], warnings: [], error_skipped: false, bypass_eligible: null,
    bypass_block_reason: "", dedup_action: "", image_urls: {},
    data: { text_html: "<p>Q</p>", options: [opt("<p>A</p>", true), opt("<p>B</p>")], explanation_html: "<p>E</p>", ...data },
    ...over,
  });
}
function detail(row) {
  const html = renderToStaticMarkup(React.createElement(RowDetail, { row, onSave() {}, onDelete() {} }));
  return new JSDOM(`<body>${html}</body>`).window.document.body;
}
const visible = (el) => {
  const c = el.cloneNode(true);
  c.querySelectorAll(".katex-mathml").forEach((n) => n.remove());
  return c.textContent;
};
const editors = (root) => [...root.querySelectorAll("textarea[data-editor]")];
const previews = (root) => [...root.querySelectorAll("[data-rendered-preview-box]")];
const katexIn = (el) => el.querySelectorAll(".katex").length;

// ---- Rendered preview + untouched editor source ---------------------------------------------

const CASES = [
  ["$20$", { editorHas: "$20$", katex: 0, text: "20" }],
  ["$800 cc$", { editorHas: "$800 cc$", katex: 0, text: "800 cc" }],
  ["\\( \\gamma=\\frac52 \\)", { editorHas: "\\( \\gamma=\\frac52 \\)", katex: 1 }],
  ["\\(V^{-1}\\)", { editorHas: "\\(V^{-1}\\)", katex: 1 }],
  ["\\(\\lambda\\)", { editorHas: "\\(\\lambda\\)", katex: 1 }],
  ["\\(\\frac{n}{N}\\)", { editorHas: "\\(\\frac{n}{N}\\)", katex: 1 }],
  ["\\[\\frac{n}{N}\\]", { editorHas: "\\[\\frac{n}{N}\\]", katex: 1 }],
  ["$$\\frac{n}{N}$$", { editorHas: "$$\\frac{n}{N}$$", katex: 1 }],
  ["The volume is $800 cc$ and pressure is \\(P\\).", { editorHas: "The volume is $800 cc$", katex: 1, text: "The volume is 800 cc and pressure is P." }],
  ["<strong>Bold</strong> and <em>italic</em> $20$ days<br>next \\(x^2\\)", { editorHas: "$20$ days", katex: 1 }],
];

for (const field of ["question", "option", "explanation"]) {
  for (const [source, expect] of CASES) {
    test(`${field}: ${source.slice(0, 40)} -> rendered preview correct, editor source untouched`, () => {
      const html = `<p>${source}</p>`;
      const data =
        field === "question" ? { text_html: html } : field === "option" ? { options: [opt(html, true), opt("<p>B</p>")] } : { explanation_html: html };
      const root = detail(makeRow({}, data));

      const boxes = previews(root);
      const idx = field === "question" ? 0 : field === "option" ? 1 : 3; // question, option A, option B, explanation
      const box = boxes[idx];
      assert.ok(box, "a rendered-preview box exists for this field");
      assert.equal(katexIn(box), expect.katex);
      if (expect.text !== undefined) assert.equal(visible(box).replace("Rendered preview", "").trim(), expect.text);
      if (expect.katex > 0) assert.equal(/\\\(|\\\[|\$/.test(visible(box).replace("Rendered preview", "")), false, "no raw delimiters in the preview");

      // the editor still holds the exact source, delimiters included
      const editorText = editors(root).map((e) => e.textContent).join("\n");
      assert.ok(editorText.includes(expect.editorHas.replace(/&/g, "&")), `editor keeps raw source: ${expect.editorHas}`);
    });
  }
}

test("one rendered preview per editor: question + each option + explanation", () => {
  const root = detail(makeRow({}, { options: [opt("<p>A</p>", true), opt("<p>B</p>"), opt("<p>C</p>")] }));
  assert.equal(editors(root).length, 5);
  assert.equal(previews(root).length, 5);
  assert.ok(previews(root).every((b) => visible(b).startsWith("Rendered preview")), "clearly labelled as a preview");
});

test("the preview never converts source into equation nodes and never alters the data", () => {
  const data = { text_html: "<p>\\(\\lambda\\) and $20$ and \\[x\\]</p>", options: [opt("<p>$$y$$</p>", true), opt("<p>\\(z\\)</p>")], explanation_html: "<p>$q$</p>" };
  const frozen = makeRow({}, data);                // deep-frozen: any write would throw
  const root = detail(frozen);
  assert.equal(root.innerHTML.includes("data-equation"), false);
  assert.equal(editors(root)[0].textContent, "<p>\\(\\lambda\\) and $20$ and \\[x\\]</p>");
  assert.deepEqual(JSON.parse(JSON.stringify(frozen.data)), data);
});

test("an empty field shows a neutral placeholder instead of an empty box", () => {
  const root = detail(makeRow({}, { text_html: "", explanation_html: "" }));
  assert.ok(visible(previews(root)[0]).includes("Nothing to preview yet."));
});

// ---- Skip / Delete wording and states -------------------------------------------------------

test("an unresolved, skippable error offers 'ignore it and import anyway' — never 'excluded'", () => {
  const root = detail(makeRow({ status: "error", errors: ['Option 2 duplicates option 1 ("x").'], bypass_eligible: true }));
  const panel = root.querySelector("[data-skip-panel]");
  assert.ok(panel.textContent.includes("Skip this error — ignore it and import this question anyway"));
  assert.doesNotMatch(root.textContent, /excluded from this import/i);
  assert.doesNotMatch(root.textContent, /just don.t import it/i);
});

test("after Skip: says the error is ignored and the question WILL still be imported, with Undo", () => {
  const root = detail(makeRow({ status: "error", errors: ['Option 2 duplicates option 1 ("x").'], error_skipped: true, bypass_eligible: true }));
  const panel = root.querySelector("[data-skip-panel]");
  assert.ok(panel.textContent.includes("Skipped — validation error ignored; this question will still be imported."));
  assert.ok(panel.textContent.includes("Undo Skip"));
  assert.ok(root.textContent.includes('Option 2 duplicates option 1 ("x").'), "the ignored error is still shown");
  assert.equal(panel.textContent.includes("Skip this error"), false);
});

test("an error that can't be safely imported explains why and offers no Skip", () => {
  const reason = "This error can't be skipped because the question can't be imported safely: Question text is blank. Fix the question, or delete it.";
  const root = detail(makeRow({ status: "error", errors: ["Question text is blank."], bypass_eligible: false, bypass_block_reason: reason }));
  const panel = root.querySelector("[data-skip-panel]");
  assert.ok(panel.querySelector("[data-cannot-skip]"));
  assert.ok(panel.textContent.includes("This error can't be skipped."));
  assert.ok(panel.textContent.includes("Question text is blank."));
  assert.equal([...panel.querySelectorAll("button")].length, 0, "no Skip button for an unbypassable error");
});

test("Delete stays a separate, clearly-worded action that means 'do not import'", () => {
  const root = detail(makeRow({ status: "error", bypass_eligible: true }));
  const del = [...root.querySelectorAll("button")].find((b) => b.textContent.includes("Delete this question"));
  assert.ok(del, "Delete action present");
  assert.ok(del.textContent.includes("don't import it"));
});

test("valid and warning rows show no Skip panel", () => {
  for (const status of ["valid", "warning"]) assert.equal(detail(makeRow({ status })).querySelector("[data-skip-panel]"), null);
});

test("the Skip control is not offered outside error rows (duplicate rows keep their own decision UI)", () => {
  const root = detail(makeRow({ status: "duplicate", dedup_action: "" }));
  assert.equal(root.querySelector("[data-skip-panel]"), null);
  assert.ok(root.textContent.includes("Duplicate — choose an action:"));
});

test("a skipped error that is also a duplicate shows the skip note AND the duplicate decision", () => {
  const root = detail(makeRow({ status: "duplicate", error_skipped: true, dedup_action: "", errors: ['Option 3 duplicates option 2.'], bypass_eligible: null }));
  const note = root.querySelector("[data-skipped-duplicate-note]");
  assert.ok(note, "explains that the skipped error still imports, but the duplicate needs a decision");
  assert.ok(note.textContent.includes("skipped"));
  assert.ok(root.textContent.includes("Duplicate — choose an action:"));
  assert.equal(root.querySelector("[data-skip-panel]"), null, "no Skip/Undo control on a duplicate-status row");
});

test("a plain duplicate row has no skip note", () => {
  assert.equal(detail(makeRow({ status: "duplicate", error_skipped: false })).querySelector("[data-skipped-duplicate-note]"), null);
});
