/**
 * The Bulk Import editor is a SOURCE editor for delimited LaTeX: it must keep
 * raw $…$, $$…$$, \(…\), \[…\] text exactly as imported, never convert it into
 * editor-native equation nodes, and so never change the stored content.
 * Uses the real TipTap core, StarterKit and the app's real EquationNode.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body><div id='e'></div></body>", { pretendToBeVisual: true });
for (const k of ["window", "document", "navigator", "Node", "Element", "HTMLElement", "DOMParser", "MutationObserver", "getComputedStyle", "requestAnimationFrame"]) {
  try { globalThis[k] = dom.window[k]; } catch { Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true }); }
}
const { Editor } = await import("@tiptap/core");
const StarterKit = (await import("@tiptap/starter-kit")).default;
const { loadJsx } = await import("../../test-utils/loadJsx.mjs");
const { EquationNode } = await loadJsx("components/richeditor/EquationNode.js");

function roundTrip(html) {
  const editor = new Editor({ element: dom.window.document.getElementById("e"), extensions: [StarterKit, EquationNode], content: html });
  let equations = 0;
  editor.state.doc.descendants((n) => { if (n.type.name === "equation") equations += 1; });
  const out = editor.getHTML();
  editor.destroy();
  return { out, equations };
}

const SOURCES = [
  "<p>\\(\\lambda\\) particles per second are emitted by \\(N\\) atoms</p>",
  "<p>\\(\\left(\\frac{n}{N}\\right)\\text{ s}\\)</p>",
  "<p>$\\lambda$ and $20$ and $800 cc$</p>",
  "<p>$$\\frac{n}{N}$$</p>",
  "<p>\\[\\frac{n}{N}\\]</p>",
  "<p>\\(\\gamma=\\frac52\\)</p>",
  "<p><strong>Bold</strong> \\(V^{-1}\\)</p>",
];

for (const src of SOURCES) {
  test(`raw delimiters survive the editor unchanged: ${src.slice(0, 44)}`, () => {
    const { out, equations } = roundTrip(src);
    assert.equal(equations, 0, "no equation node may be created from delimiter text");
    assert.equal(out, src, "stored content is byte-for-byte unchanged");
    assert.equal(out.includes("data-equation"), false);
  });
}

test("list content: ProseMirror wraps list-item text in <p>, but the delimiters inside are untouched", () => {
  const { out, equations } = roundTrip("<ul><li>$x^2$</li><li>\\(\\alpha\\)</li></ul>");
  assert.equal(equations, 0);
  assert.equal(out, "<ul><li><p>$x^2$</p></li><li><p>\\(\\alpha\\)</p></li></ul>");
});

test("only the editor's own native equation markup becomes an equation node", () => {
  const { equations } = roundTrip('<p>x <span data-equation="\\lambda" data-display-mode="false"></span></p>');
  assert.equal(equations, 1);
});
