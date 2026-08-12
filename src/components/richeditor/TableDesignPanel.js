"use client";

import { useEditorState } from "@tiptap/react";
import { TABLE_STYLE_PRESETS } from "./tableStyles";

const CELL_COLORS = ["", "#fef3c7", "#dbeafe", "#dcfce7", "#fee2e2", "#f3e8ff"];
const BORDER_COLORS = ["#d1d5db", "#93c5fd", "#86efac", "#fcd34d", "#f87171", "#111827"];
const BORDER_STYLES = ["solid", "dashed", "dotted"];

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded border px-1.5 py-1 text-[10px] font-semibold ${
        active ? "border-brand-blue bg-brand-blue text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function TableDesignPanel({ editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const attrs = e.getAttributes("table");
      return {
        tableStyle: attrs.tableStyle || "default",
        bandedRows: !!attrs.bandedRows,
        bandedColumns: !!attrs.bandedColumns,
        firstColumn: !!attrs.firstColumn,
        lastColumn: !!attrs.lastColumn,
        showTotalRow: !!attrs.showTotalRow,
        isHeaderRow: e.isActive("tableHeader"),
        borderColor: attrs.borderColor,
        borderWidth: attrs.borderWidth,
        borderStyle: attrs.borderStyle || "solid",
      };
    },
  });
  if (!state) return null;

  function setTableAttr(patch) {
    editor.chain().focus().updateAttributes("table", patch).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-amber-50 px-2 py-1.5">
      <span className="mr-1 text-[10px] font-bold uppercase text-amber-700">Table style:</span>
      <div className="flex flex-wrap gap-1">
        {TABLE_STYLE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            title={p.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTableAttr({ tableStyle: p.key })}
            className={`h-5 w-8 rounded border ${state.tableStyle === p.key ? "ring-2 ring-brand-blue" : "border-[var(--color-border)]"}`}
            style={{ background: p.headerBg === "transparent" ? "white" : p.headerBg }}
          />
        ))}
      </div>

      <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />

      <ToggleBtn active={state.isHeaderRow} onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
        Header Row
      </ToggleBtn>
      <ToggleBtn active={state.showTotalRow} onClick={() => setTableAttr({ showTotalRow: !state.showTotalRow })}>
        Total Row
      </ToggleBtn>
      <ToggleBtn active={state.firstColumn} onClick={() => setTableAttr({ firstColumn: !state.firstColumn })}>
        First Column
      </ToggleBtn>
      <ToggleBtn active={state.lastColumn} onClick={() => setTableAttr({ lastColumn: !state.lastColumn })}>
        Last Column
      </ToggleBtn>
      <ToggleBtn active={state.bandedRows} onClick={() => setTableAttr({ bandedRows: !state.bandedRows })}>
        Banded Rows
      </ToggleBtn>
      <ToggleBtn active={state.bandedColumns} onClick={() => setTableAttr({ bandedColumns: !state.bandedColumns })}>
        Banded Columns
      </ToggleBtn>

      <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />

      <span className="text-[10px] text-amber-700">Border:</span>
      <div className="flex gap-1">
        {BORDER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTableAttr({ borderColor: c })}
            className={`h-4 w-4 rounded border ${state.borderColor === c ? "ring-2 ring-brand-blue" : "border-[var(--color-border)]"}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <select
        value={state.borderWidth ?? ""}
        onChange={(e) => setTableAttr({ borderWidth: e.target.value ? Number(e.target.value) : null })}
        className="hm-input h-7 w-16 text-[10px]"
      >
        <option value="">Width</option>
        {[1, 2, 3, 4].map((w) => (
          <option key={w} value={w}>
            {w}px
          </option>
        ))}
      </select>
      <select
        value={state.borderStyle}
        onChange={(e) => setTableAttr({ borderStyle: e.target.value })}
        className="hm-input h-7 w-20 text-[10px]"
      >
        {BORDER_STYLES.map((s) => (
          <option key={s} value={s}>
            {s[0].toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />
      <span className="text-[10px] text-amber-700">Cell shading:</span>
      {CELL_COLORS.map((c) => (
        <button
          key={c || "none"}
          type="button"
          title={c || "No fill"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setCellAttribute("backgroundColor", c || null).run()}
          className="h-4 w-4 flex-none rounded border border-[var(--color-border)]"
          style={{ background: c || "white" }}
        />
      ))}

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="ml-auto rounded px-1.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:bg-white hover:text-brand-red"
      >
        🗑 Delete table
      </button>
    </div>
  );
}
