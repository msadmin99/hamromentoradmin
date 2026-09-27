/**
 * Admin PreviewModal — renders the REAL component and asserts on the DOM.
 * It must parse math exactly like the student page: all four delimiter styles,
 * plain quantities as ordinary text, genuine math through KaTeX.
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

const { default: PreviewModal } = await loadJsx("components/richeditor/PreviewModal.js", {
  stubs: { "components/Modal": "export default function Modal({ title, children }) { return children; }" },
});

function preview(question) {
  const html = renderToStaticMarkup(React.createElement(PreviewModal, { question, onClose() {} }));
  return new JSDOM(`<body>${html}</body>`).window.document.body;
}
const base = (over = {}) => ({ text: "", marks: 1, negative_marks: 0.25, options: [], references: [], explanation: "", ...over });
const katex = (root) => root.querySelectorAll(".katex").length;
const stem = (root) => root.querySelector(".hm-richtext-content");
// KaTeX also emits a hidden MathML <annotation> carrying the TeX source; only what a
// reader can SEE counts, so drop the accessible-MathML layer before reading text.
const visibleText = (root) => {
  const c = root.cloneNode(true);
  c.querySelectorAll(".katex-mathml").forEach((n) => n.remove());
  return c.textContent;
};

test("\\(…\\) content (the reported case) is rendered as math, not raw source", () => {
  const root = preview(
    base({
      text: "<p>\\(\\lambda\\) particles per second are being emitted by \\(N\\) atoms of a radioactive element. The half-life of element will be</p>",
      options: [
        { text: "<p>\\(\\left(\\frac{n}{N}\\right)\\text{ s}\\)</p>", is_correct: false },
        { text: "<p>\\(\\frac{0.693 N}{n}\\text{ s}\\)</p>", is_correct: true },
      ],
    }),
  );
  assert.equal(katex(stem(root)), 2);
  assert.equal(visibleText(root).includes("\\("), false, "no raw \\( delimiters may remain");
  assert.equal(visibleText(root).includes("\\frac"), false);
  assert.equal(katex(root), 4);
});

test("all delimiter styles render (parity with the student renderer)", () => {
  for (const src of ["$\\lambda$", "$$\\frac{n}{N}$$", "\\(\\lambda\\)", "\\[\\frac{n}{N}\\]", "\\(\\[x^2\\]\\)"]) {
    const root = preview(base({ text: `<p>${src}</p>` }));
    assert.equal(katex(root), 1, src);
    assert.equal(/\\\(|\\\[|\$/.test(visibleText(root)), false, `raw delimiter left for ${src}`);
  }
});

test("plain quantities in every delimiter style stay ordinary text", () => {
  const cases = [
    ["20, 24 and 15", "20, 24 and 15"],
    ["800 cc", "800 cc"],
    ["25\\%", "25%"],
    ["37^\\circ C", "37°C"],
    ["9:3:3:1", "9:3:3:1"],
    ["5 kg", "5 kg"],
    ["60\\,\\text{ kg}", "60 kg"],
    ["\\text{HCl}", "HCl"],
  ];
  for (const [expr, text] of cases) {
    for (const wrap of [(e) => `$${e}$`, (e) => `\\(${e}\\)`]) {
      const root = preview(base({ text: `<p>Q ${wrap(expr)} end</p>` }));
      assert.equal(katex(stem(root)), 0, `${expr} must not be KaTeX`);
      assert.equal(stem(root).textContent, `Q ${text} end`);
    }
  }
});

test("genuine math (powers, fractions, Greek, chemistry, ambiguous words) goes through KaTeX", () => {
  const exprs = ["x^2", "V^{-1}", "\\frac{1}{2}", "\\gamma=\\frac52", "\\alpha", "H_2O", "Ca^{2+}", "\\text{Na}^+", "2\\times10^{-3}", "velocity", "5x", "P=20"];
  for (const expr of exprs) {
    for (const wrap of [(e) => `$${e}$`, (e) => `\\(${e}\\)`]) {
      assert.equal(katex(stem(preview(base({ text: `<p>${wrap(expr)}</p>` })))), 1, expr);
    }
  }
});

test("options and the explanation use the same renderer; layout markers are unchanged", () => {
  const root = preview(
    base({
      text: "<p>Q</p>",
      options: [
        { text: "<p>$20$ days</p>", is_correct: true },
        { text: "<p>\\(x^2\\)</p>", is_correct: false },
      ],
      explanation: "<p>Because \\(\\lambda\\) and $800 cc$.</p>",
    }),
  );
  const text = root.textContent;
  assert.ok(text.includes("A)") && text.includes("B)") && text.includes("✓ Correct") && text.includes("Explanation"));
  assert.ok(text.includes("20 days"));
  assert.ok(text.includes("800 cc"));
  assert.equal(katex(root), 2);
});

test("an empty question still shows the empty placeholder", () => {
  assert.ok(preview(base({ text: "" })).textContent.includes("Empty question"));
});
