/**
 * Admin "what students will see" renderer.
 *
 * (1) DRIFT GUARD — the math rules are byte-identical copies of the student
 *     app's files (separate repositories). These tests fail if a copy is
 *     edited without the other, so Admin can never silently render math
 *     differently from students.
 * (2) BEHAVIOUR — every delimiter style students get, plain-text quantities
 *     staying ordinary text, genuine math going through KaTeX, HTML preserved,
 *     output sanitised. Assertions are on the parsed DOM.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { renderStudentHtml } = await import("./studentHtml.js");

const here = dirname(fileURLToPath(import.meta.url));
const SHARED = ["mathDelimiters.js", "richHtml.js", "trivialMath.js"];
// SHA-256 of the student app's committed files these copies must equal. If you
// change a shared file you MUST change it in BOTH repositories and update these.
const PINNED = {
  "mathDelimiters.js": "daf3e19fd14ce2422f35163da9d3c0aaca884a99775a60092be60b842c6dca69",
  "richHtml.js": "fccf3c604cc2464cbe56b87c2e735c0e1bd7fed194c118e8260c7e8c7f4e342b",
  "trivialMath.js": "b51dac386166fb69114944f26cc97b2e2ba9ea2754b2ae7c42c47073d9835949",
};
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

for (const f of SHARED) {
  test(`drift guard: Admin ${f} equals the pinned student-app version`, () => {
    assert.equal(sha(readFileSync(join(here, f))), PINNED[f], `${f} differs from the student app's copy — change both repos together`);
  });
  test(`drift guard: Admin ${f} is byte-identical to the sibling Frontend repo (when present)`, (t) => {
    const sibling = join(here, "..", "..", "..", "Frontend", "src", "lib", f);
    if (!existsSync(sibling)) return t.skip("Frontend repo not checked out next to Admin");
    assert.equal(sha(readFileSync(join(here, f))), sha(readFileSync(sibling)));
  });
}

const render = (html) => {
  const root = new JSDOM(`<body><div id="r">${renderStudentHtml(html)}</div></body>`).window.document.getElementById("r");
  return root;
};
const inKatex = (root) => root.querySelectorAll(".katex").length;
const outside = (root) => {
  const c = root.cloneNode(true);
  c.querySelectorAll(".katex, .katex-display").forEach((n) => n.remove());
  return c.textContent;
};

const DELIMS = [
  ["$…$", (e) => `$${e}$`],
  ["\\(…\\)", (e) => `\\(${e}\\)`],
];
const MATH = [
  "\\gamma=\\frac52", "V^{-1}", "\\lambda", "\\frac{n}{N}", "x^2", "H_2O", "\\alpha", "2\\times10^{-3}",
  "\\left(\\frac{n}{N}\\right)\\text{ s}", "Ca^{2+}", "P=20", "5x", "AB", "-5", "\\sqrt{2}", "\\vec{a}+\\vec{b}",
];
const PLAIN = [
  ["20", "20"], ["24", "24"], ["800 cc", "800 cc"], ["800\\ cc", "800 cc"], ["60 kg", "60 kg"], ["5\\,m", "5 m"], ["10 cm", "10 cm"],
  ["100 mL", "100 mL"], ["25\\%", "25%"], ["15 days", "15 days"], ["3.14", "3.14"], ["37^\\circ C", "37°C"], ["180^\\circ", "180°"],
  ["9:3:3:1", "9:3:3:1"], ["9 : 3 : 3 : 1", "9 : 3 : 3 : 1"], ["\\text{HCl}", "HCl"], ["20, 24 and 15", "20, 24 and 15"], ["2\\,\\Omega", "2 Ω"],
];

for (const [name, wrap] of DELIMS) {
  for (const e of MATH) {
    test(`renders genuine math with KaTeX: ${name} ${e}`, () => {
      const root = render(`<p>Given ${wrap(e)} here.</p>`);
      assert.equal(inKatex(root), 1);
      assert.equal(outside(root), "Given  here.");
    });
  }
  for (const [e, text] of PLAIN) {
    test(`plain quantity stays ordinary text: ${name} ${e}`, () => {
      const root = render(`<p>Value ${wrap(e)} noted.</p>`);
      assert.equal(inKatex(root), 0, "must not be typeset as math");
      assert.equal(root.textContent, `Value ${text} noted.`);
    });
  }
}

test("display delimiters: $$…$$ and \\[…\\] render as display math, even when the content looks plain", () => {
  for (const src of ["$$\\frac{n}{N}$$", "\\[\\frac{n}{N}\\]", "$$5$$", "\\[20\\]"]) {
    assert.equal(render(`<p>${src}</p>`).querySelectorAll(".katex-display").length, 1, src);
  }
});

test("malformed nested delimiters \\(\\[…\\]\\) are normalised to display math", () => {
  assert.equal(render("<p>\\(\\[x^2\\]\\)</p>").querySelectorAll(".katex-display").length, 1);
});

test("ambiguous words stay KaTeX; math-mode italics are preserved", () => {
  assert.equal(inKatex(render("<p>the $velocity$ and \\(Allium\\ cepa\\)</p>")), 2);
});

test("mixed prose + several inline fragments: only real math is typeset", () => {
  const root = render("<p>The values are \\(x=2\\), \\(y=3\\) and \\(z=5\\) for $20$ days at $800 cc$.</p>");
  assert.equal(inKatex(root), 3);
  assert.ok(root.textContent.includes("for 20 days at 800 cc."));
});

test("rich HTML is preserved alongside math", () => {
  const root = render("<p><strong>Note:</strong> <em>in $20$ days</em><br>$x^2$ and \\(\\alpha\\)</p><ul><li>$\\text{HCl}$ and \\(V^{-1}\\)</li><li>plain</li></ul>");
  assert.equal(root.querySelectorAll("strong").length, 1);
  assert.equal(root.querySelectorAll("em").length, 1);
  assert.equal(root.querySelectorAll("br").length, 1);
  assert.equal(root.querySelectorAll("ul > li").length, 2);
  assert.equal(inKatex(root), 3);
  assert.equal(root.querySelector("em").textContent, "in 20 days");
});

test("output is sanitised (script / event handlers removed) and KaTeX output survives", () => {
  const root = render('<p onclick="x()">hi \\(x^2\\)</p><script>alert(1)</script><img src=x onerror="alert(1)">');
  assert.equal(root.querySelectorAll("script").length, 0);
  assert.equal(root.innerHTML.includes("onerror"), false);
  assert.equal(root.innerHTML.includes("onclick"), false);
  assert.equal(inKatex(root), 1);
});

test("empty / null input renders nothing and never throws", () => {
  assert.equal(renderStudentHtml(""), "");
  assert.equal(renderStudentHtml(null), "");
  assert.equal(renderStudentHtml(undefined), "");
});

test("the source string is never mutated", () => {
  const src = "<p>\\(\\lambda\\) and $20$</p>";
  const copy = String(src);
  renderStudentHtml(src);
  assert.equal(src, copy);
});
