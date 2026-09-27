import katex from "katex";
import { decodeHtmlEntities, renderMathInHtml } from "./mathDelimiters.js";

// Pure (DOM-free) part of <RichContent>'s pipeline, split out so it can be
// unit-tested and DOM-verified under `node --test` (RichContent.js itself
// imports dompurify and JSX). RichContent calls renderRichHtml() and then
// sanitizes the result.

/** Explanation redesign, stage 2 — production bug: a value that was
 * legitimately HTML-escaped once at import time (e.g. bulk-import content
 * containing a literal "&" or comparison operator) occasionally reaches
 * this component already escaped a SECOND time — "&amp;lt;" instead of
 * "&lt;" — most likely from a content author copy-pasting already-escaped
 * markup, or re-saving already-escaped text through a path that escapes
 * again. A double-escaped "&amp;lt;" only ever decodes ONE level through
 * normal HTML parsing, leaving the literal text "&lt;" visible to the
 * student. This collapses exactly one extra level of encoding for the five
 * standard entities — never a blind global string replace, and never
 * touching a genuinely single-escaped (i.e. correct) "&lt;", which this
 * regex cannot match at all since it requires the literal "&amp;" prefix. */
export function collapseDoubleEncodedEntities(html) {
  if (!html) return html;
  return html.replace(/&amp;(lt|gt|amp|quot|apos|#39);/g, "&$1;");
}

/** The docx/rich-text import pipeline splits a LaTeX command across separate
 * bold/italic runs when only part of it was styled in the source document —
 * e.g. "\vec{A}" with just "vec" bolded comes back as "\<strong>vec</strong>{A}",
 * which breaks the command and makes KaTeX render its own garbled error output
 * instead of throwing (throwOnError is off). LaTeX never legitimately contains
 * a literal "<letter" tag-shaped run, so stripping any embedded tags from
 * inside a captured math expression before handing it to KaTeX recovers the
 * original command cleanly. */
export function stripEmbeddedTags(expr) {
  return expr.replace(/<\/?[a-zA-Z][^>]*>/g, "").replace(/&lt;\/?[a-zA-Z][^&]*?&gt;/g, "");
}

/** Bulk-imported questions sometimes carry raw LaTeX source typed straight into
 * a Word/Excel cell instead of using the admin's equation-editor button — the
 * import pipeline has no way to know that's math, so it lands in `text` as
 * literal characters. Production content uses a mix of TeX `$...$`/`$$...$$`
 * markers AND MathJax-style `\(...\)`/`\[...\]` delimiters (plus, on some
 * legacy rows, a malformed nested pair like `\(\[...\]\)`) — `renderMathInHtml`
 * (src/lib/mathDelimiters.js) recognises all four and normalises the
 * malformed nesting before handing each bare expression to KaTeX, so it
 * doesn't matter which delimiter style a given row happens to use. */
export function renderInlineLatex(html) {
  if (!html) return html;
  return renderMathInHtml(html, (expr, { displayMode }) => {
    // decodeHtmlEntities BEFORE stripEmbeddedTags: an entity-encoded tag
    // ("&lt;strong&gt;...&lt;/strong&gt;") becomes a real tag first, so the
    // existing tag-stripping regex below catches it the same way it always
    // caught a literal <strong> — see decodeHtmlEntities's own docstring
    // in mathDelimiters.js for the production bug this closes (a real "<"/
    // ">" comparison operator inside a math expression, legitimately
    // HTML-escaped by the storage layer, must reach KaTeX as the literal
    // character it represents, not as unrendered entity text).
    const cleaned = stripEmbeddedTags(decodeHtmlEntities(expr)).trim();
    if (!cleaned) return null;
    try {
      return katex.renderToString(cleaned, { throwOnError: false, displayMode });
    } catch {
      return null;
    }
  });
}


/** collapse double-encoded entities, then render math. Sanitizing is the caller's job. */
export function renderRichHtml(html) {
  return renderInlineLatex(collapseDoubleEncodedEntities(html));
}
