"use client";

import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { DrawingNode } from "./drawing/DrawingNode";
import { EquationNode } from "./EquationNode";
import { ImageExtended } from "./ImageExtended";
import { IndentExtension } from "./IndentExtension";
import { AudioEmbed, VideoEmbed } from "./MediaNode";
import TableRibbon from "./TableRibbon";
import Toolbar from "./Toolbar";
import { uploadRichMedia } from "./uploadMedia";
import { cleanWordHTML, uploadPastedBase64Images } from "./wordPaste";

// Shared cell-level attributes (background/vertical-align/margin/direction) —
// used by both the plain-cell and header-cell extensions below.
function cellAttributes() {
  return {
    backgroundColor: {
      default: null,
      renderHTML: (attributes) =>
        attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
      parseHTML: (element) => element.style.backgroundColor || null,
    },
    verticalAlign: {
      default: null,
      renderHTML: (attributes) => (attributes.verticalAlign ? { style: `vertical-align: ${attributes.verticalAlign}` } : {}),
      parseHTML: (element) => element.style.verticalAlign || null,
    },
    cellMargin: {
      default: null,
      renderHTML: (attributes) => (attributes.cellMargin ? { style: `padding: ${attributes.cellMargin}px` } : {}),
      parseHTML: (element) => (element.style.padding ? parseInt(element.style.padding, 10) : null),
    },
    textDirection: {
      default: null,
      renderHTML: (attributes) => (attributes.textDirection ? { style: `direction: ${attributes.textDirection}` } : {}),
      parseHTML: (element) => element.style.direction || null,
    },
    verticalText: {
      default: false,
      renderHTML: (attributes) => (attributes.verticalText ? { style: "writing-mode: vertical-rl" } : {}),
      parseHTML: (element) => element.style.writingMode === "vertical-rl",
    },
  };
}

const TableCellColored = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});
const TableHeaderColored = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});
const TableRowSized = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        renderHTML: (attributes) => (attributes.height ? { style: `height: ${attributes.height}px` } : {}),
        parseHTML: (element) => (element.style.height ? parseInt(element.style.height, 10) : null),
      },
    };
  },
});

const TableStyled = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableStyle: { default: "default", renderHTML: (a) => ({ "data-table-style": a.tableStyle || "default" }), parseHTML: (el) => el.dataset.tableStyle || "default" },
      bandedRows: { default: false, renderHTML: (a) => ({ "data-banded-rows": a.bandedRows ? "true" : "false" }), parseHTML: (el) => el.dataset.bandedRows === "true" },
      bandedColumns: { default: false, renderHTML: (a) => ({ "data-banded-columns": a.bandedColumns ? "true" : "false" }), parseHTML: (el) => el.dataset.bandedColumns === "true" },
      firstColumn: { default: false, renderHTML: (a) => ({ "data-first-column": a.firstColumn ? "true" : "false" }), parseHTML: (el) => el.dataset.firstColumn === "true" },
      lastColumn: { default: false, renderHTML: (a) => ({ "data-last-column": a.lastColumn ? "true" : "false" }), parseHTML: (el) => el.dataset.lastColumn === "true" },
      showTotalRow: { default: false, renderHTML: (a) => ({ "data-total-row": a.showTotalRow ? "true" : "false" }), parseHTML: (el) => el.dataset.totalRow === "true" },
      borderColor: {
        default: null,
        renderHTML: (a) => (a.borderColor ? { style: `border-color: ${a.borderColor}` } : {}),
        parseHTML: (el) => el.style.borderColor || null,
      },
      borderWidth: {
        default: null,
        renderHTML: (a) => (a.borderWidth != null ? { style: `border-width: ${a.borderWidth}px` } : {}),
        parseHTML: (el) => (el.style.borderWidth ? parseInt(el.style.borderWidth, 10) : null),
      },
      borderStyle: {
        default: "solid",
        renderHTML: (a) => ({ style: `border-style: ${a.borderStyle || "solid"}` }),
        parseHTML: (el) => el.style.borderStyle || "solid",
      },
    };
  },
  // Deliberately NOT overriding renderHTML — the base Table extension's own
  // implementation builds the colgroup (per-column width persistence, via a
  // separate DOM node, unaffected by anything below) and the resizable-columns
  // wrapper div; reimplementing it here would risk silently breaking both.
  // Trade-off: when a custom border-color/width/style is set, the resulting
  // merged `style` string makes the base renderHTML skip its own fallback
  // table-width style (it treats any non-empty style as a full override) —
  // acceptable since actual column widths come from the colgroup, not that
  // fallback; the table just sizes to its columns instead of an explicit width.
});

async function insertImageFromFile(editor, file) {
  try {
    const data = await uploadRichMedia(file);
    editor.chain().focus().setImage({ src: data.url, fileSize: data.size }).run();
  } catch {
    // best-effort — ignore a failed inline paste/drop upload
  }
}

export default function RichEditor({ value, onChange, placeholder, minHeight = 110 }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [wordPasteNotice, setWordPasteNotice] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextStyleKit.configure({ backgroundColor: false }),
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      IndentExtension,
      TableStyled.configure({ resizable: true }),
      TableRowSized,
      TableHeaderColored,
      TableCellColored,
      ImageExtended,
      Placeholder.configure({ placeholder: placeholder || "Start typing…" }),
      EquationNode,
      VideoEmbed,
      AudioEmbed,
      DrawingNode,
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "hm-richtext-content" },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) {
          event.preventDefault();
          insertImageFromFile(editor, file);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const file = Array.from(event.clipboardData?.files || []).find((f) => f.type.startsWith("image/"));
        if (file) {
          event.preventDefault();
          insertImageFromFile(editor, file);
          return true;
        }
        // No literal File on the clipboard — likely a Word/HTML paste.
        // transformPastedHTML (below) already cleaned Word's cruft; let
        // ProseMirror's default parsing run, then asynchronously swap any
        // base64 <img> it just inserted for a properly uploaded one — this
        // can't happen synchronously inside this hook (uploads are async).
        setTimeout(() => {
          uploadPastedBase64Images(editor, uploadRichMedia, () => setWordPasteNotice(true));
        }, 0);
        return false;
      },
      transformPastedHTML: cleanWordHTML,
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editor) return;
    if ((value || "") !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white"
          : "rounded-xl border border-[var(--color-border)] bg-white"
      }
    >
      <Toolbar editor={editor} fullscreen={fullscreen} onToggleFullscreen={() => setFullscreen((v) => !v)} />
      <TableRibbon editor={editor} />
      {wordPasteNotice && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          <span>
            Pasted image(s) saved to media storage. Word&apos;s clipboard only provides preview-resolution images — for
            guaranteed full quality, drag the original image file in instead.
          </span>
          <button onClick={() => setWordPasteNotice(false)} className="flex-none font-bold">
            ✕
          </button>
        </div>
      )}
      <div className={fullscreen ? "flex-1 overflow-y-auto px-4 py-3" : ""} style={fullscreen ? undefined : { minHeight }}>
        <EditorContent editor={editor} className={fullscreen ? "" : "px-3 py-2"} style={fullscreen ? undefined : { minHeight }} />
      </div>
    </div>
  );
}
