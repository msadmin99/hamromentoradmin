"use client";

import { useState } from "react";
import { useEditorState } from "@tiptap/react";
import TableDesignPanel from "./TableDesignPanel";
import TableLayoutPanel from "./TableLayoutPanel";

export default function TableRibbon({ editor }) {
  const [tab, setTab] = useState("design");
  const inTable = useEditorState({ editor, selector: ({ editor: e }) => !!e?.isActive("table") });

  if (!inTable) return null;

  return (
    <div>
      <div className="flex gap-0.5 border-b border-[var(--color-border)] bg-amber-100 px-2 pt-1">
        <span className="mr-2 self-center text-[10px] font-bold uppercase text-amber-700">Table</span>
        {[
          { key: "design", label: "Design" },
          { key: "layout", label: "Layout" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab(t.key)}
            className={`rounded-t px-3 py-1 text-[11px] font-semibold ${
              tab === t.key ? "bg-amber-50 text-amber-800" : "text-amber-700 hover:bg-amber-50/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "design" ? <TableDesignPanel editor={editor} /> : <TableLayoutPanel editor={editor} />}
    </div>
  );
}
