"use client";

import { useState } from "react";

export default function ExamBuilderModal({ title, tabs, onCancel, onSave, saving, error }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeTab) || tabs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="hm-card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="hm-btn-outline">
              Cancel
            </button>
            <button onClick={() => onSave(false)} disabled={saving} className="hm-btn-outline">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => onSave(true)} disabled={saving} className="hm-btn-primary">
              {saving ? "Saving…" : "Save and close"}
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                active?.key === t.key
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 rounded-lg bg-brand-red-light px-3 py-2 text-xs font-medium text-brand-red">{error}</p>}
          {active?.content}
        </div>
      </div>
    </div>
  );
}
