"use client";

import { useEditorState } from "@tiptap/react";
import { useState } from "react";
import InsertMenu from "./InsertMenu";
import SymbolPanel from "./SymbolPanel";

const FONT_FAMILIES = ["", "Inter", "Georgia", "Times New Roman", "Arial", "Courier New"];
const FONT_SIZES = ["", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_SPACINGS = ["", "1", "1.15", "1.5", "2"];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];
const TEXT_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#a16207", "#7c3aed"];

function ToolbarButton({ onClick, active, children, title, disabled }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`hm-toolbar-btn disabled:opacity-40 ${
        active ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px flex-none bg-[var(--color-border)]" />;
}

function ColorSwatchPicker({ colors, onPick, title }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolbarButton title={title} onClick={() => setOpen((o) => !o)}>
        {title === "Text color" ? "A🎨" : "🖍"}
      </ToolbarButton>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-lg border border-[var(--color-border)] bg-white p-1.5 shadow-2xl">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="h-5 w-5 rounded border border-[var(--color-border)]"
                style={{ background: c }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Toolbar({ editor, fullscreen, onToggleFullscreen }) {
  const [showSymbols, setShowSymbols] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      superscript: e.isActive("superscript"),
      subscript: e.isActive("subscript"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      alignLeft: e.isActive({ textAlign: "left" }),
      alignCenter: e.isActive({ textAlign: "center" }),
      alignRight: e.isActive({ textAlign: "right" }),
      alignJustify: e.isActive({ textAlign: "justify" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  async function pasteAsPlainText() {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text.replace(/\n/g, "<br>")).run();
    } catch {
      window.alert("Couldn't read the clipboard — your browser may need permission. Try Ctrl/Cmd+Shift+V instead.");
    }
  }

  function insertEquation() {
    editor.chain().focus().insertContent({ type: "equation", attrs: { latex: "" } }).run();
  }

  return (
    <div className="relative flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] px-1.5 py-1">
      {/* Clipboard */}
      <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo}>
        ↶
      </ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo}>
        ↷
      </ToolbarButton>
      <ToolbarButton title="Paste as plain text" onClick={pasteAsPlainText}>
        Paste Plain
      </ToolbarButton>
      <Divider />

      {/* Font */}
      <select
        title="Font family"
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontFamily(v).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        className="hm-toolbar-select w-36"
        defaultValue=""
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f || "default"} value={f}>
            {f || "Font"}
          </option>
        ))}
      </select>
      <select
        title="Font size"
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontSize(v).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
        className="hm-toolbar-select w-20"
        defaultValue=""
      >
        {FONT_SIZES.map((s) => (
          <option key={s || "default"} value={s}>
            {s || "Size"}
          </option>
        ))}
      </select>
      <Divider />

      {/* Format */}
      <ToolbarButton title="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton title="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton title="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton title="Superscript" active={state.superscript} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        x²
      </ToolbarButton>
      <ToolbarButton title="Subscript" active={state.subscript} onClick={() => editor.chain().focus().toggleSubscript().run()}>
        x₂
      </ToolbarButton>
      <ColorSwatchPicker
        title="Text color"
        colors={TEXT_COLORS}
        onPick={(c) => editor.chain().focus().setColor(c).run()}
      />
      <ColorSwatchPicker
        title="Highlight color"
        colors={HIGHLIGHT_COLORS}
        onPick={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
      />
      <ToolbarButton
        title="Clear formatting"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      >
        Clear
      </ToolbarButton>
      <Divider />

      {/* Paragraph */}
      <ToolbarButton title="Align left" active={state.alignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        ⯇
      </ToolbarButton>
      <ToolbarButton title="Align center" active={state.alignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        ≡
      </ToolbarButton>
      <ToolbarButton title="Align right" active={state.alignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        ⯈
      </ToolbarButton>
      <ToolbarButton title="Justify" active={state.alignJustify} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        ☰
      </ToolbarButton>
      <select
        title="Line & paragraph spacing"
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setLineHeight(v).run();
          else editor.chain().focus().unsetLineHeight().run();
        }}
        className="hm-toolbar-select w-24"
        defaultValue=""
      >
        {LINE_SPACINGS.map((s) => (
          <option key={s || "default"} value={s}>
            {s ? `${s}×` : "Spacing"}
          </option>
        ))}
      </select>
      <ToolbarButton title="Indent" onClick={() => editor.chain().focus().increaseIndent().run()}>
        →|
      </ToolbarButton>
      <ToolbarButton title="Outdent" onClick={() => editor.chain().focus().decreaseIndent().run()}>
        |←
      </ToolbarButton>
      <ToolbarButton title="Bullet list" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
      <ToolbarButton title="Block quote" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        &ldquo; &rdquo;
      </ToolbarButton>
      <Divider />

      {/* Insert / equation / symbols */}
      <InsertMenu editor={editor} />
      <ToolbarButton title="Insert equation" onClick={insertEquation}>
        ∑ Equation
      </ToolbarButton>
      <div className="relative">
        <ToolbarButton title="Insert symbol" onClick={() => setShowSymbols((v) => !v)}>
          Ω Symbol
        </ToolbarButton>
        {showSymbols && (
          <SymbolPanel
            onInsert={(sym) => {
              editor.chain().focus().insertContent(sym).run();
            }}
            onClose={() => setShowSymbols(false)}
          />
        )}
      </div>
      <Divider />

      <ToolbarButton title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onToggleFullscreen}>
        {fullscreen ? "⤢ Exit" : "⛶ Fullscreen"}
      </ToolbarButton>
    </div>
  );
}
