"use client";

import { useState } from "react";
import { SYMBOL_CATEGORIES } from "./symbols-data";

export default function SymbolPanel({ onInsert, onClose }) {
  const [tab, setTab] = useState(SYMBOL_CATEGORIES[0].key);
  const active = SYMBOL_CATEGORIES.find((c) => c.key === tab);

  return (
    <div className="absolute z-50 mt-1 w-80 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-text)]">Insert Symbol</p>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-[var(--color-text-muted)]">
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-2">
        {SYMBOL_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setTab(c.key)}
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              tab === c.key ? "bg-brand-blue text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
        {active.symbols.map((sym, i) => (
          <button
            key={`${sym}-${i}`}
            type="button"
            onClick={() => onInsert(sym)}
            className="rounded p-1.5 text-base hover:bg-[var(--color-surface-muted)]"
            title={sym}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
