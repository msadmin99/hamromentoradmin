/**
 * Admin-side "what students will see" renderer.
 *
 * The math rules are NOT reimplemented here: mathDelimiters.js, richHtml.js and
 * trivialMath.js are byte-identical copies of the student app's
 * (Frontend/src/lib) — the two apps are separate repositories, so a copy is the
 * established mechanism, and studentHtml.test.mjs fails if they ever drift.
 * This file only adds what the student component does around them: HTML
 * sanitizing (the same DOMPurify profile RichContent uses), because imported
 * question HTML must never be injected into the Admin page unsanitised.
 *
 * Pipeline (identical to the student's RichContent):
 *   renderRichHtml (collapse double-encoded entities -> renderMathInHtml ->
 *   trivialMath classification -> KaTeX) -> DOMPurify.
 */
import DOMPurify from "dompurify";
import { renderRichHtml } from "./richHtml.js";

// Same profile as the student RichContent: HTML + MathML + SVG (KaTeX output),
// with `style` allowed (KaTeX layout relies on it).
const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true, mathMl: true, svg: true },
  ADD_ATTR: ["style", "target"],
};

/** Rendered, sanitised HTML exactly as a student would see it. Never throws;
 * returns "" when there is nothing to render or no DOM is available to sanitise
 * with (fail closed — never return unsanitised HTML). */
export function renderStudentHtml(html) {
  if (!html) return "";
  if (!DOMPurify.isSupported) return "";
  try {
    return DOMPurify.sanitize(renderRichHtml(html), SANITIZE_CONFIG);
  } catch {
    return "";
  }
}
