"use client";

import { useEditorState } from "@tiptap/react";
import { distributeColumns, distributeRows, sortTableByCurrentColumn } from "./tableCommands";

function Btn({ onClick, children, title, disabled, active }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-1.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-amber-600 text-white" : "text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-text)]"
      }`}
    >
      {children}
    </button>
  );
}

const ALIGN_GRID = [
  { h: "left", v: "top" },
  { h: "center", v: "top" },
  { h: "right", v: "top" },
  { h: "left", v: "middle" },
  { h: "center", v: "middle" },
  { h: "right", v: "middle" },
  { h: "left", v: "bottom" },
  { h: "center", v: "bottom" },
  { h: "right", v: "bottom" },
];

export default function TableLayoutPanel({ editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const cellAttrs = e.getAttributes("tableCell").verticalAlign ? e.getAttributes("tableCell") : e.getAttributes("tableHeader");
      return {
        canMerge: e.can().mergeCells(),
        canSplit: e.can().splitCell(),
        verticalAlign: cellAttrs.verticalAlign || "top",
        cellMargin: cellAttrs.cellMargin || "",
        textDirection: cellAttrs.textDirection || "ltr",
        verticalText: !!cellAttrs.verticalText,
        rowHeight: e.getAttributes("tableRow").height || "",
      };
    },
  });
  if (!state) return null;

  function setAlignment(h, v) {
    editor.chain().focus().setTextAlign(h).setCellAttribute("verticalAlign", v).run();
  }

  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-[var(--color-border)] bg-amber-50 px-2 py-1.5">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Rows</p>
        <div className="flex gap-1">
          <Btn title="Insert row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
            +Above
          </Btn>
          <Btn title="Insert row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
            +Below
          </Btn>
          <Btn title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
            −Row
          </Btn>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Columns</p>
        <div className="flex gap-1">
          <Btn title="Insert column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>
            +Left
          </Btn>
          <Btn title="Insert column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            +Right
          </Btn>
          <Btn title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
            −Col
          </Btn>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Cells</p>
        <div className="flex gap-1">
          <Btn disabled={!state.canMerge} onClick={() => editor.chain().focus().mergeCells().run()}>
            Merge
          </Btn>
          <Btn disabled={!state.canSplit} onClick={() => editor.chain().focus().splitCell().run()}>
            Split
          </Btn>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Alignment</p>
        <div className="grid grid-cols-3 gap-0.5">
          {ALIGN_GRID.map((a) => (
            <button
              key={`${a.h}-${a.v}`}
              type="button"
              title={`${a.v} ${a.h}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAlignment(a.h, a.v)}
              className="h-4 w-4 border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-muted)]"
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Cell size</p>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            placeholder="Row h."
            value={state.rowHeight}
            onChange={(e) => editor.chain().focus().updateAttributes("tableRow", { height: e.target.value ? Number(e.target.value) : null }).run()}
            className="hm-input h-7 w-16 text-[10px]"
          />
          <Btn title="AutoFit — content-driven sizing" onClick={() => editor.chain().focus().command(distributeColumns(false)).command(distributeRows()).run()}>
            AutoFit
          </Btn>
          <Btn title="Distribute rows evenly" onClick={() => editor.chain().focus().command(distributeRows()).run()}>
            Distribute Rows
          </Btn>
          <Btn title="Distribute columns evenly" onClick={() => editor.chain().focus().command(distributeColumns(true)).run()}>
            Distribute Cols
          </Btn>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Text</p>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            placeholder="Margin"
            value={state.cellMargin}
            onChange={(e) => editor.chain().focus().setCellAttribute("cellMargin", e.target.value ? Number(e.target.value) : null).run()}
            className="hm-input h-7 w-16 text-[10px]"
          />
          <Btn
            active={state.textDirection === "rtl"}
            onClick={() => editor.chain().focus().setCellAttribute("textDirection", state.textDirection === "rtl" ? "ltr" : "rtl").run()}
          >
            {state.textDirection === "rtl" ? "RTL" : "LTR"}
          </Btn>
          <Btn active={state.verticalText} onClick={() => editor.chain().focus().setCellAttribute("verticalText", !state.verticalText).run()}>
            Vertical Text
          </Btn>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-amber-700">Sorting</p>
        <div className="flex gap-1">
          <Btn title="Sort this column ascending" onClick={() => editor.chain().focus().command(sortTableByCurrentColumn("asc")).run()}>
            ↑ Asc
          </Btn>
          <Btn title="Sort this column descending" onClick={() => editor.chain().focus().command(sortTableByCurrentColumn("desc")).run()}>
            ↓ Desc
          </Btn>
        </div>
      </div>
    </div>
  );
}
