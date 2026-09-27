/**
 * Student-side math-delimiter handling for <RichContent>.
 *
 * The app renders LaTeX with KaTeX's *string* renderer
 * (`katex.renderToString`) so it works during SSR and inside content that
 * is injected via `dangerouslySetInnerHTML`. KaTeX's string renderer does
 * NOT scan for delimiters - the caller has to find each math span itself
 * and hand KaTeX the bare expression.
 *
 * Historically <RichContent> only scanned for TeX `$...$` / `$$...$$`
 * markers. A large amount of production question/option/explanation
 * content (typed by hand, or produced by the docx / bulk-import pipeline)
 * instead uses the MathJax-style delimiters `\( ... \)` (inline) and
 * `\[ ... \]` (display), and some legacy rows carry a malformed nested
 * pair like `\(\[ ... \]\)`. None of those were recognised, so the raw
 * LaTeX source - delimiters and all - fell straight through to the
 * browser as visible text.
 *
 * This module is intentionally dependency-free (no `katex`, no
 * `dompurify`, no DOM) so it is unit-testable under `node --test`. The
 * actual KaTeX call is injected by the caller.
 */

import { trivialMathToText } from "./trivialMath.js";

/**
 * Fix malformed legacy nesting from imports: an inline pair wrapping a
 * display pair, or vice-versa. The INNER delimiter wins the block/inline
 * decision, which is the required normalisation
 * (`\(\[ ... \]\)` -> `\[ ... \]`).
 *
 * Only collapses a *complete* wrapper whose inner span is itself a
 * complete opposite-type pair, so it can never eat a legitimate
 * expression.
 */
export function normalizeNestedDelimiters(input) {
  if (!input) return input;
  let out = String(input);
  let prev;
  do {
    prev = out;
    out = out
      .replace(/\\\(\s*\\\[([\s\S]*?)\\\]\s*\\\)/g, "\\[$1\\]")
      .replace(/\\\[\s*\\\(([\s\S]*?)\\\)\s*\\\]/g, "\\($1\\)");
  } while (out !== prev);
  return out;
}

/**
 * Strip redundant outer delimiter layers left by odd nesting such as
 * `\(\(x\)\)`, `\($x$\)` or `\(\[x\]\)` (once the block/inline choice has
 * already been made by the surrounding pass). Never touches an expression
 * that isn't *entirely* wrapped, so `a\(b\)c` is returned unchanged.
 */
export function unwrapRedundant(expr) {
  let out = String(expr == null ? "" : expr).trim();
  for (let i = 0; i < 4; i += 1) {
    const m =
      /^\\\(([\s\S]*)\\\)$/.exec(out) ||
      /^\\\[([\s\S]*)\\\]$/.exec(out) ||
      /^\$\$([\s\S]*)\$\$$/.exec(out) ||
      /^\$([\s\S]*)\$$/.exec(out);
    if (!m) break;
    const inner = m[1].trim();
    if (!inner || inner === out) break;
    out = inner;
  }
  return out;
}

/**
 * Classify a stand-alone LaTeX string (e.g. the dedicated `latex` field,
 * which normally holds a bare expression but is sometimes pasted with
 * delimiters). Returns `{ expr, display }` with the delimiters removed.
 */
export function classifyStandaloneLatex(raw) {
  const norm = normalizeNestedDelimiters(String(raw == null ? "" : raw).trim());
  let m = /^\\\[([\s\S]*)\\\]$/.exec(norm);
  if (m) return { expr: unwrapRedundant(m[1]), display: true };
  m = /^\$\$([\s\S]*)\$\$$/.exec(norm);
  if (m) return { expr: unwrapRedundant(m[1]), display: true };
  m = /^\\\(([\s\S]*)\\\)$/.exec(norm);
  if (m) return { expr: unwrapRedundant(m[1]), display: false };
  m = /^\$([\s\S]*)\$$/.exec(norm);
  if (m) return { expr: unwrapRedundant(m[1]), display: false };
  return { expr: unwrapRedundant(norm), display: false };
}

/*
 * Display-mode delimiters are scanned before inline ones so a `\[ ... \]`
 * span is never mis-split by the inline `\( ... \)` / `$ ... $` pass. The
 * inline `$ ... $` rule keeps its original shape (no newlines, non-empty)
 * so plain prose containing a lone `$` is left alone exactly as before.
 */
const DELIMITERS = [
  { display: true, re: /\$\$([\s\S]+?)\$\$/g },
  { display: true, re: /\\\[([\s\S]+?)\\\]/g },
  { display: false, re: /\\\(([\s\S]+?)\\\)/g },
  { display: false, re: /\$([^$\n]+?)\$/g },
];

// Placeholder wrapper used while later delimiter passes still need to run.
// U+E000 is a Unicode Private Use Area code point with no legitimate
// occurrence in question/option/explanation HTML, so a slot index wrapped
// between two of them can never collide with real content (including
// plain digits or numbers that were left un-rendered).
const PUA = String.fromCharCode(0xe000);
const openSlot = (n) => `${PUA}${n}${PUA}`;
const SLOT_RE = new RegExp(`${PUA}(\\d+)${PUA}`, "g");

// Production bug (explanation redesign, stage 2): a real HTML `<`/`>`/`&`
// character inside a math expression is legitimately HTML-escaped by the
// bulk-import pipeline before storage (academics/importers: `html.escape`)
// — e.g. a content author typing `\(K_a < 6\)` straight into a spreadsheet
// cell lands in the DB as `\(K_a &lt; 6\)`, which is completely correct
// HTML. The bug was downstream: the extracted math expression was handed
// to KaTeX still carrying the entity text ("K_a &lt; 6") instead of the
// literal character it represents ("K_a < 6"). KaTeX has no concept of
// HTML entities — it treats "&lt;" as four ordinary characters to render
// literally, and since ANY correct HTML generator must escape a literal
// `&` it is asked to display, KaTeX's own output ends up containing
// "&amp;lt;" — which the browser then decodes exactly once, leaving the
// literal text "&lt;" visible to the student. Decoding entities in the
// expression BEFORE handing it to KaTeX (see RichContent.js's
// `renderInlineLatex`, which calls this) closes the gap at its root: KaTeX
// receives the real "<" character, which is itself valid, legitimate math
// syntax, and its own output escaping then behaves correctly.
const NAMED_HTML_ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " " };

export function decodeHtmlEntities(text) {
  if (!text) return text;
  return String(text).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, ref) => {
    if (ref[0] === "#") {
      const isHex = ref[1] === "x" || ref[1] === "X";
      const codePoint = isHex ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_HTML_ENTITIES, ref) ? NAMED_HTML_ENTITIES[ref] : match;
  });
}

// Production bug (explanation redesign, stage 2): a content author
// sometimes types a bare LaTeX command directly into prose without
// wrapping it in \(...\)/$...$ at all (e.g. "A \Rightarrow B" with no
// delimiters around the arrow) — since renderMathInHtml only ever looked
// for delimited spans, an undelimited command was never found at all and
// reached the browser as literal backslash-prefixed text. This is a
// closed, finite allowlist of command names actually used in this app's
// science/medical content (never a generic `\[A-Za-z]+` scan) — a bare
// backslash immediately followed by one of these names is, in practice,
// unambiguously intended as math in this domain; anything not on the list
// is left completely untouched rather than guessed at.
const BARE_LATEX_COMMANDS = [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa",
  "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
  "rightarrow", "Rightarrow", "leftarrow", "Leftarrow", "leftrightarrow", "Leftrightarrow",
  "longrightarrow", "Longrightarrow",
  "times", "div", "pm", "mp", "cdot", "circ", "leq", "geq", "neq", "approx", "equiv", "propto",
  "sim", "infty", "partial", "nabla", "degree",
  "frac", "sqrt", "sum", "prod", "int", "oint", "text", "mathrm", "mathbf", "mathit", "ce",
  "overline", "underline", "vec", "hat", "bar",
];
// `(?![a-zA-Z])` after the command name stops a coincidental longer word
// (an unlikely but possible "\alphabet"-shaped run) from partially
// matching just the "\alpha" prefix; up to two `{...}` argument groups
// covers every listed command, including two-argument `\frac{a}{b}`.
const BARE_LATEX_RE = new RegExp(`\\\\(?:${BARE_LATEX_COMMANDS.join("|")})(?![a-zA-Z])(?:\\{[^{}]*\\}){0,2}`, "g");

function wrapBareLatexCommands(text) {
  return text.replace(BARE_LATEX_RE, (m) => `\\(${m}\\)`);
}

/**
 * Replace every `$...$`, `$$...$$`, `\(...\)` and `\[...\]` span in `html`
 * with `render(expr, { displayMode })`. Also catches a bare, undelimited
 * command from the allowlist above (see `wrapBareLatexCommands`) as a
 * second pass, after every properly-delimited span has already been
 * consumed — never before, so a command legitimately already inside a
 * `\(...\)` expression is never re-wrapped a second time.
 *
 * - Malformed nested delimiters are normalised first.
 * - Each rendered span is parked behind the PUA placeholder above and only
 *   swapped back in at the very end, so KaTeX output (which embeds the
 *   TeX source itself inside a MathML `<annotation>`) can never be
 *   re-scanned by a later delimiter pass.
 * - If `render` returns a non-string / empty value, or throws, the
 *   ORIGINAL delimited source is kept verbatim - content is never
 *   silently dropped.
 * - The bare-command pass only ever runs on text OUTSIDE any HTML tag —
 *   critical so it can never reach into e.g. the Admin equation editor's
 *   own `data-equation="\Rightarrow"` attribute value and corrupt the tag.
 */
export function renderMathInHtml(html, render) {
  if (!html) return html;
  const slots = [];

  function applyDelimiters(str) {
    let result = str;
    for (const { display, re } of DELIMITERS) {
      result = result.replace(re, (match, expr) => {
        const cleaned = unwrapRedundant(expr);
        if (!cleaned) return match;
        // Plain numbers / quantities ("$20$", "\(800\ cc\)") wrapped in math
        // delimiters stay ordinary text — KaTeX would set them in the larger
        // serif math font. See trivialMath.js. Display math is always honoured.
        if (!display) {
          const plain = trivialMathToText(cleaned);
          if (plain !== null) {
            slots.push(plain);
            return openSlot(slots.length - 1);
          }
        }
        let rendered;
        try {
          rendered = render(cleaned, { displayMode: display });
        } catch {
          return match;
        }
        if (typeof rendered !== "string" || !rendered) return match;
        slots.push(rendered);
        return openSlot(slots.length - 1);
      });
    }
    return result;
  }

  let out = applyDelimiters(normalizeNestedDelimiters(html));

  out = out
    .split(/(<[^>]*>)/)
    .map((segment, i) => {
      if (i % 2 === 1) return segment; // an HTML tag itself — never touched
      const wrapped = wrapBareLatexCommands(segment);
      return wrapped === segment ? segment : applyDelimiters(wrapped);
    })
    .join("");

  return out.replace(SLOT_RE, (_, i) => slots[Number(i)] ?? "");
}
