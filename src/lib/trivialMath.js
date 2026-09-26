/**
 * Classifies a delimited "math" span as PLAIN, MATH or AMBIGUOUS.
 *
 * Production bug (first reported on a mock test and, per a scan of the whole
 * 18,165-question bank, present across a large class of questions): content
 * authors and the docx / AI-generated sources we import routinely wrap plain
 * text in math delimiters: numbers ("in $20$, $24$ and $15$ days"),
 * quantities ("\(800\ cc\)", "$25\%$"), explicit text ("$\text{HCl}$"),
 * ratios ("$9 : 3 : 3 : 1$") and angles ("$180^\circ$"). KaTeX faithfully
 * typesets those in its serif math font, so they look larger than the
 * surrounding prose although nothing about them is mathematical.
 *
 * THE RULE IS DELIBERATELY ONE-SIDED: only a span with a positive,
 * unambiguous signal that it is ordinary text becomes plain text. Every
 * other span — genuine math AND anything we are unsure about — goes to KaTeX
 * exactly as it always did. Wrongly demoting math to text destroys meaning;
 * wrongly keeping text as math is only a cosmetic size difference.
 *
 * States
 *   PLAIN      every part is one of
 *                - a plain number (20, 3.14, 1,000, 25%) or a list of them,
 *                  optionally joined by "and" / "or" / "to" ("20, 24 and 15");
 *                - a number with a degree sign (180^\circ -> 180°, 37^\circ C);
 *                - a numeric ratio (9 : 3 : 3 : 1);
 *                - a number followed by a unit: (a) a multi-letter unit that
 *                  is never a variable, after any whitespace (800 cc, 5 kg,
 *                  15 days); or (b) a single-letter / product-like unit
 *                  (m, s, A, V, N, K, mg, Omega) ONLY after an explicit TeX
 *                  unit gap (5\,m, 2\ A, 2\,\Omega) — see EXPLICIT_ONLY_UNITS
 *                  for why "0.4 V" (moles = 0.4 x volume) and "3mg"
 *                  (physics tension) must stay math. A unit is NEVER
 *                  trusted without a number directly in front of it;
 *                - an explicit \text{...} / \textrm{...} / \textnormal{...}
 *                  group whose payload has no TeX syntax — the author
 *                  already declared it text ("\text{HCl}", "70\text{S}",
 *                  "1\text{ mole}").
 *   MATH       any TeX syntax outside those groups (backslash command,
 *              ^ _ { } = + - * / < > ( ) [ ] | & ...), any other digit
 *              content (5x, 2n, 3d), or a short variable-like token
 *              (P, n, AB, ax, Rr).
 *   AMBIGUOUS  neither of the above — chiefly letters-only words such as
 *              "velocity", "pressure", "Allium cepa". Length alone cannot
 *              tell prose from a product of variables or an intentionally
 *              italicised name, so these are KEPT AS MATH (math-mode
 *              italics preserved). \textit{...}, \mathrm{...}, \emph{...}
 *              and every chemical formula with sub/superscripts (H_2O,
 *              Ca^{2+}, \text{Na}^+) are likewise never demoted.
 *
 * Dependency-free so it runs under `node --test`.
 */

// Units safe to accept after a number separated by ANY whitespace ("800 cc",
// "5 kg"). Multi-letter symbols that are not also common variables/products.
const SPACED_UNITS = new Set([
  "cc", "cm", "mm", "km", "kg", "ml", "mL", "dl", "dL",
  "ms", "min", "sec", "hr", "hrs",
  "kW", "kV", "mV", "mA", "Hz", "kHz", "MHz", "Pa", "kPa", "mol",
  "cal", "kcal", "atm", "eV", "keV", "MeV", "ppm", "dB", "rad", "mmHg",
  "mole", "moles", "second", "seconds", "minute", "minutes", "hour", "hours",
  "day", "days", "week", "weeks", "month", "months", "year", "years",
  "Rs", "rupees", "metres", "meters", "litres", "liters",
]);

// Units that are ALSO everyday variables or products of variables: m (mass),
// g (gravity), s, h, N, J, W, A (area), V (volume), K, l, L, "mg" (m*g — the
// bank has `3mg`, `5mg`, `F = mg` in physics), and the Ohm sign. The bank
// holds `0.4 V` meaning 0.4 x volume ("moles = 0.4 V"), and in math mode a
// typed space is invisible, so "number space letter" carries no unit signal
// for these. They are accepted only after EXPLICIT TeX unit spacing (\, or
// "\ " or ~) — the deliberate value/unit gap authors type for quantities
// (156 of the bank's 157 "N \Omega" spans do exactly this) — or inside
// \text{...}. Otherwise uncertain -> stays KaTeX.
const EXPLICIT_ONLY_UNITS = new Set(["m", "g", "s", "h", "N", "J", "W", "A", "V", "K", "l", "L", "mg", "Ω"]);

// Glued to a number ("800cc", "5kg"): multi-letter only, and never the
// product-like ones ("5ms", "3hr").
const ATTACHED_UNITS = new Set(
  [...SPACED_UNITS].filter((u) => u.length >= 2 && !["ms", "hr", "hrs", "min", "sec", "Rs"].includes(u)),
);

// Marks an explicit TeX spacing command (\, \  \; \: \! ~) so the value/unit
// gap the author typed on purpose survives normalisation.
const EXPLICIT_GAP = "\u2009";

const CONNECTIVES = new Set(["and", "or", "to"]);
const NUM = /^\d[\d.,]*%?$/;
const NUM_DEG = /^\d[\d.,]*°[CF]?$/;
const RATIO = /^\d[\d.,]*(?:\s*:\s*\d[\d.,]*)+$/;
const TEXT_GROUP = /\\(?:text|textrm|textnormal)\s*\{([^{}]*)\}/g;
// A \text{} payload the author marked as text must itself be free of TeX
// syntax (so a payload carrying markup or a command stays math).
const BAD_TEXT_PAYLOAD = /[\\^_{}$#&<>=~]/;
const TEX_SIGNIFICANT = /[\\^_{}=+\-*/<>()[\]|&$#]/;

function normalize(s) {
  return s
    .replace(/\\[ ,;:!]/g, EXPLICIT_GAP)
    .replace(/\\%/g, "%")
    .replace(/&nbsp;|~/g, EXPLICIT_GAP)
    // "2\ \Omega" / "2\,\Omega": the Ohm command right after a number is the unit sign
    .replace(/(\d[\d.,]*)([ \u2009]*)\\Omega(?![A-Za-z])/g, "$1$2Ω")
    .replace(/(\d[\d.,]*)\s*\^\s*(?:\{\s*\\circ\s*\}|\\circ)(?:\s+(?=[CF]\b))?/g, "$1°");
}

const strip = (t) => (t ?? "").replace(/[,.]+$/, "");
const isNumberish = (t) => NUM.test(t) || NUM_DEG.test(t);
// A unit is only trusted directly after a bare number (not "50%" or "37°").
const isBareNumber = (t) => /^\d[\d.,]*$/.test(t);

/** Validates one stretch of text that sits OUTSIDE any \text{} group.
 * `state` carries across stretches so "500\text{ cm}"-style splits still see
 * the number in front of a unit. Returns the normalised text, or null if
 * the stretch is not positively recognisable as plain. */
function plainOutsideText(piece, state) {
  const s = normalize(piece).replace(/[ \t\r\n]+/g, " ");
  const body = s.trim();
  if (!body) return s;
  if (TEX_SIGNIFICANT.test(body)) return null;
  if (RATIO.test(body.replace(/\u2009/g, " "))) {
    state.kinds.add("ratio");
    state.sawNumber = true;
    return s;
  }
  const parts = body.split(/([ \u2009]+)/);
  const tokens = [];
  const seps = [""]; // seps[i] = the separator BEFORE tokens[i]
  parts.forEach((part, k) => (k % 2 === 0 ? tokens.push(part) : seps.push(part)));
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = strip(tokens[i]);
    if (!tok) return null;
    if (isNumberish(tok)) {
      state.kinds.add(tok.endsWith("%") ? "percent" : tok.includes("°") ? "degree" : "number");
      state.sawNumber = true;
      state.afterDegree = tok.endsWith("°");
      continue;
    }
    // "37^\circ C" normalises to "37°" "C": a temperature-scale letter directly
    // after a degree sign is text, not a variable.
    if (state.afterDegree && (tok === "C" || tok === "F")) {
      state.afterDegree = false;
      continue;
    }
    state.afterDegree = false;
    const attached = /^(\d[\d.,]*)([A-Za-z]+\d?)$/.exec(tok);
    if (attached && ATTACHED_UNITS.has(attached[2])) {
      state.kinds.add("number-unit");
      state.sawNumber = true;
      continue;
    }
    // A unit only ever counts directly after a bare number token.
    if (
      isBareNumber(strip(tokens[i - 1])) &&
      (SPACED_UNITS.has(tok) || (EXPLICIT_ONLY_UNITS.has(tok) && seps[i].includes(EXPLICIT_GAP)))
    ) {
      state.kinds.add("number-unit");
      continue;
    }
    // "20, 24 and 15": a connective between two numbers.
    if (CONNECTIVES.has(tok) && isNumberish(strip(tokens[i - 1])) && isNumberish(strip(tokens[i + 1]))) {
      state.kinds.add("number-list");
      continue;
    }
    return null;
  }
  return s;
}

/**
 * @returns {{state: "plain"|"math"|"ambiguous", text?: string, kind?: string}}
 *   `text` and `kind` are set only when state is "plain".
 */
export function classifyMathSpan(expr) {
  if (expr == null) return { state: "math" };
  const source = String(expr).trim();
  if (!source) return { state: "math" };

  const state = { sawNumber: false, afterDegree: false, kinds: new Set() };
  let out = "";
  let last = 0;
  let sawText = false;
  let ok = true;
  let m;
  TEXT_GROUP.lastIndex = 0;
  while ((m = TEXT_GROUP.exec(source)) !== null) {
    const before = plainOutsideText(source.slice(last, m.index), state);
    if (before === null) {
      ok = false;
      break;
    }
    // TeX text-mode typography: "--" is an en dash, "---" an em dash.
    const payload = m[1].replace(/&nbsp;/g, " ").replace(/---/g, "—").replace(/--/g, "–");
    if (BAD_TEXT_PAYLOAD.test(payload)) {
      ok = false;
      break;
    }
    out += before + payload;
    sawText = true;
    last = m.index + m[0].length;
  }
  if (ok) {
    const tail = plainOutsideText(source.slice(last), state);
    if (tail === null) ok = false;
    else out += tail;
  }
  out = out.replace(new RegExp(EXPLICIT_GAP, "g"), " ").replace(/\s+/g, " ").trim();
  if (ok && out) {
    let kind;
    if (sawText) kind = state.sawNumber ? "number-text" : "text-group";
    else {
      kind = ["number-unit", "number-list", "ratio", "degree", "percent", "number"].find((k) => state.kinds.has(k));
    }
    return { state: "plain", text: out, kind };
  }

  // Not plain. Distinguish "definitely math" from "unsure" — both stay KaTeX.
  const flat = source.replace(/\\[ ,;:!]/g, " ").trim();
  if (TEX_SIGNIFICANT.test(flat) || /\d/.test(flat) || /^[A-Za-z]{1,4}$/.test(flat)) return { state: "math" };
  return { state: "ambiguous" };
}

/** Plain-text form of `expr`, or null when it is math OR ambiguous. */
export function trivialMathToText(expr) {
  const c = classifyMathSpan(expr);
  return c.state === "plain" ? c.text : null;
}
