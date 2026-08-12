"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import { EQUATION_TEMPLATE_CATEGORIES } from "./symbols-data";

function EquationView({ node, updateAttributes, selected }) {
  // A freshly-inserted equation (toolbar button just ran insertContent with
  // empty latex) drops straight into editing, matching Word's "Insert
  // Equation" — no second click needed. A previously-saved equation still
  // opens closed until clicked.
  const [editing, setEditing] = useState(!node.attrs.latex);
  const [draft, setDraft] = useState(node.attrs.latex || "");
  const [displayMode, setDisplayMode] = useState(node.attrs.displayMode || false);
  const [activeCategory, setActiveCategory] = useState(EQUATION_TEMPLATE_CATEGORIES[0].key);
  const [mathfieldReady, setMathfieldReady] = useState(false);
  const mathfieldRef = useRef(null);

  const html = useMemo(() => {
    const source = editing ? draft : node.attrs.latex;
    if (!source?.trim()) return "";
    try {
      return katex.renderToString(source, { throwOnError: false, displayMode: editing ? displayMode : node.attrs.displayMode });
    } catch {
      return "";
    }
  }, [editing, draft, displayMode, node.attrs.latex, node.attrs.displayMode]);

  // MathLive registers a <math-field> custom element — browser-only, so it's
  // imported dynamically inside an effect (same pattern DrawingCanvasEditor.js
  // already uses for `fabric`), never at module scope.
  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    import("mathlive").then(() => {
      if (cancelled) return;
      setMathfieldReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [editing]);

  useEffect(() => {
    if (!mathfieldReady || !mathfieldRef.current) return;
    const mf = mathfieldRef.current;
    mf.value = draft;
    function onInput() {
      setDraft(mf.value);
    }
    mf.addEventListener("input", onInput);
    mf.focus();
    return () => mf.removeEventListener("input", onInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mathfieldReady]);

  function openEditor() {
    setDraft(node.attrs.latex || "");
    setDisplayMode(node.attrs.displayMode || false);
    setMathfieldReady(false);
    setEditing(true);
  }
  function save() {
    updateAttributes({ latex: draft, displayMode });
    setEditing(false);
  }
  function insertTemplate(latex) {
    if (mathfieldRef.current) {
      mathfieldRef.current.insert(latex, { focus: true });
      setDraft(mathfieldRef.current.value);
    } else {
      setDraft((d) => (d ? `${d} ${latex}` : latex));
    }
  }

  const category = EQUATION_TEMPLATE_CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <NodeViewWrapper
      as="span"
      className="hm-equation-node"
      data-selected={selected ? "true" : "false"}
      data-display-mode={node.attrs.displayMode ? "true" : "false"}
    >
      {/* The rendered equation always stays inline with surrounding text; the
          editor pops up as an absolutely-positioned overlay anchored to it
          instead of being inserted into the text flow, which would otherwise
          push a multi-line panel mid-sentence and overlap adjacent content. */}
      <span
        onClick={openEditor}
        className="hm-equation-render"
        contentEditable={false}
        dangerouslySetInnerHTML={{ __html: html || (editing ? "" : '<span class="hm-equation-placeholder">Click to add equation</span>') }}
      />
      {editing && (
        <span className="hm-equation-editor-anchor" contentEditable={false}>
          <span className="hm-equation-editor hm-equation-editor-wide">
            <span className="hm-equation-editor-header">
              <span className="hm-equation-editor-title">Equation Editor</span>
              <label className="hm-equation-mode-toggle">
                <input type="checkbox" checked={displayMode} onChange={(e) => setDisplayMode(e.target.checked)} />
                Display mode
              </label>
            </span>

            <span className="hm-equation-mathfield-wrap">
              {/* Initial LaTeX is set imperatively via mf.value once the custom
                  element is registered (see effect above) — not as JSX
                  children, to avoid React and MathLive fighting over the
                  element's text content. */}
              <math-field ref={mathfieldRef} math-virtual-keyboard-policy="manual" smart-fence="true" class="hm-equation-mathfield" />

              {!mathfieldReady && <span className="hm-equation-mathfield-loading">Loading equation editor…</span>}
            </span>

            <span className="hm-equation-editor-preview" dangerouslySetInnerHTML={{ __html: html }} />

            <span className="hm-equation-template-tabs">
              {EQUATION_TEMPLATE_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCategory(c.key)}
                  className={`hm-equation-template-tab ${activeCategory === c.key ? "active" : ""}`}
                >
                  {c.label}
                </button>
              ))}
            </span>
            <span className="hm-equation-editor-quickinserts">
              {category.templates.map((t) => (
                <button key={t.label} type="button" onClick={() => insertTemplate(t.latex)} title={t.latex}>
                  {t.label}
                </button>
              ))}
            </span>

            <span className="hm-equation-editor-actions">
              <button type="button" onClick={save} className="hm-btn-primary px-2 py-1 text-[10px]">
                Done
              </button>
              <button type="button" onClick={() => setEditing(false)} className="hm-btn-outline px-2 py-1 text-[10px]">
                Cancel
              </button>
            </span>
          </span>
        </span>
      )}
    </NodeViewWrapper>
  );
}

export const EquationNode = Node.create({
  name: "equation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-equation") || "",
      },
      displayMode: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-display-mode") === "true",
      },
    };
  },

  parseHTML() {
    return [
      { tag: "span[data-equation]" },
      {
        // Best-effort: some Word configurations paste an equation as MathML
        // with an `alttext` attribute carrying a LaTeX-ish plaintext
        // fallback — if present, treat it as a real editable equation
        // instead of the garbled/rasterized default Word would otherwise
        // produce. Full structural MathML→LaTeX conversion is out of scope;
        // this only covers the common case where Word already supplies one.
        tag: "math[alttext]",
        getAttrs: (element) => {
          const alttext = element.getAttribute("alttext");
          return alttext ? { latex: alttext } : false;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Returning an actual DOM element (rather than the array tag-spec) so the
    // real KaTeX-rendered markup — not just a data attribute — ends up in the
    // saved HTML that the student Frontend renders via plain dangerouslySetInnerHTML.
    const attrs = mergeAttributes(HTMLAttributes, {
      "data-equation": node.attrs.latex,
      "data-display-mode": node.attrs.displayMode ? "true" : "false",
      class: "hm-equation-render",
    });
    const span = document.createElement("span");
    Object.entries(attrs).forEach(([key, value]) => span.setAttribute(key, value));
    try {
      katex.render(node.attrs.latex || "", span, { throwOnError: false, displayMode: !!node.attrs.displayMode });
    } catch {
      span.textContent = node.attrs.latex || "";
    }
    return span;
  },

  addNodeView() {
    return ReactNodeViewRenderer(EquationView);
  },
});
