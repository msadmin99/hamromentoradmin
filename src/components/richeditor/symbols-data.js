export const SYMBOL_CATEGORIES = [
  {
    key: "greek",
    label: "Greek",
    symbols: "α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω".split(" "),
  },
  {
    key: "math",
    label: "Math Operators",
    symbols: "± × ÷ ≤ ≥ ≠ ≈ ∞ √ ∑ ∏ ∫ ∂ ∇ ∆ ° ‰ ∝ ∅ ∈ ∉ ⊂ ⊆ ∪ ∩ ∀ ∃ ¬ ∧ ∨ ⊕ ⊗ ∴ ∵".split(" "),
  },
  {
    key: "arrows",
    label: "Arrows",
    symbols: "← → ↑ ↓ ↔ ↕ ⇐ ⇒ ⇑ ⇓ ⇔ ↦ ⇌ ⇋ ↩ ↪".split(" "),
  },
  {
    key: "medical",
    label: "Medical",
    symbols: "℞ ☤ ⚕ ♀ ♂ °C °F ≈ Δ ↑ ↓ ± ½ ¼ ¾ μg mg mL bpm".split(" "),
  },
  {
    key: "physics",
    label: "Physics",
    symbols: "Ω μ λ ν ω Φ Ψ ħ ℏ Å ∝ ∇ ∂ ∮ × ⃗ ° ′ ″".split(" "),
  },
  {
    key: "chemistry",
    label: "Chemistry",
    symbols: "→ ⇌ Δ ° ↑ ↓ · α β γ ± ⁻ ⁺ ‡ °C H₂O CO₂ NaCl".split(" "),
  },
  {
    key: "biology",
    label: "Biology",
    symbols: "♀ ♂ × → ↔ Δ α β γ ∞ ° 𝑥̄ σ μ ½".split(" "),
  },
  {
    key: "currency",
    label: "Currency",
    symbols: "₹ रू $ € £ ¥ ¢ ₩ ₽".split(" "),
  },
  {
    key: "roman",
    label: "Roman Numerals",
    symbols: "Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ Ⅺ Ⅻ ⅰ ⅱ ⅲ ⅳ ⅴ".split(" "),
  },
];

// Word-ribbon-style equation template gallery. Each `latex` string uses
// MathLive's placeholder syntax (`#0`, `#1`, ...) — inserting one of these via
// mathfield.insert() lands the cursor directly in the first empty box
// (MathLive's default `selectionMode: "placeholder"`), not just pasted text.
export const EQUATION_TEMPLATE_CATEGORIES = [
  {
    key: "fraction",
    label: "Fraction",
    templates: [
      { label: "Fraction", latex: "\\frac{#0}{#0}" },
      { label: "Small fraction", latex: "{}^{#0}\\!/_{#0}" },
      { label: "Mixed number", latex: "#0\\frac{#0}{#0}" },
    ],
  },
  {
    key: "script",
    label: "Script",
    templates: [
      { label: "Superscript", latex: "#0^{#0}" },
      { label: "Subscript", latex: "#0_{#0}" },
      { label: "Sub + superscript", latex: "#0_{#0}^{#0}" },
    ],
  },
  {
    key: "radical",
    label: "Radical",
    templates: [
      { label: "Square root", latex: "\\sqrt{#0}" },
      { label: "Nth root", latex: "\\sqrt[#0]{#0}" },
    ],
  },
  {
    key: "operator",
    label: "Big Operator",
    templates: [
      { label: "Summation", latex: "\\sum_{#0}^{#0}#0" },
      { label: "Product", latex: "\\prod_{#0}^{#0}#0" },
      { label: "Integral", latex: "\\int_{#0}^{#0}#0\\,d#0" },
      { label: "Limit", latex: "\\lim_{#0 \\to #0}#0" },
    ],
  },
  {
    key: "matrix",
    label: "Matrix",
    templates: [
      { label: "2×2 Matrix", latex: "\\begin{bmatrix}#0 & #0\\\\#0 & #0\\end{bmatrix}" },
      { label: "3×3 Matrix", latex: "\\begin{bmatrix}#0 & #0 & #0\\\\#0 & #0 & #0\\\\#0 & #0 & #0\\end{bmatrix}" },
      { label: "Determinant", latex: "\\begin{vmatrix}#0 & #0\\\\#0 & #0\\end{vmatrix}" },
    ],
  },
  {
    key: "bracket",
    label: "Bracket",
    templates: [
      { label: "Parentheses", latex: "\\left(#0\\right)" },
      { label: "Square brackets", latex: "\\left[#0\\right]" },
      { label: "Curly braces", latex: "\\left\\{#0\\right\\}" },
      { label: "Piecewise (cases)", latex: "\\begin{cases}#0 & #0\\\\#0 & #0\\end{cases}" },
    ],
  },
  {
    key: "function",
    label: "Function",
    templates: [
      { label: "sin", latex: "\\sin(#0)" },
      { label: "cos", latex: "\\cos(#0)" },
      { label: "log", latex: "\\log_{#0}(#0)" },
      { label: "ln", latex: "\\ln(#0)" },
    ],
  },
  {
    key: "accent",
    label: "Accent",
    templates: [
      { label: "Bar", latex: "\\overline{#0}" },
      { label: "Hat", latex: "\\hat{#0}" },
      { label: "Vector", latex: "\\vec{#0}" },
      { label: "Dot", latex: "\\dot{#0}" },
    ],
  },
  {
    key: "symbol",
    label: "Symbols",
    templates: [
      { label: "α β γ", latex: "\\alpha \\beta \\gamma" },
      { label: "θ λ μ π", latex: "\\theta \\lambda \\mu \\pi" },
      { label: "→", latex: "\\rightarrow" },
      { label: "≤ ≥ ≠", latex: "\\leq \\geq \\neq" },
      { label: "∞", latex: "\\infty" },
      { label: "±", latex: "\\pm" },
    ],
  },
];
