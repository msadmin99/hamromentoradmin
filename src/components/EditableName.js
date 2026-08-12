"use client";

import { useState } from "react";

export default function EditableName({ value, onSave, textClassName, inputClassName }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          disabled={saving}
          className={inputClassName || "hm-input py-1 text-sm"}
        />
        <button type="button" onClick={save} disabled={saving} className="text-xs font-bold text-brand-green" aria-label="Save name">
          ✓
        </button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-xs font-bold text-brand-red" aria-label="Cancel">
          ✕
        </button>
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1.5 ${textClassName || ""}`}>
      {value}
      <button type="button" onClick={startEdit} className="text-[var(--color-text-muted)] transition hover:text-brand-blue" aria-label="Rename">
        ✎
      </button>
    </span>
  );
}
