"use client";

import { useState } from "react";
import { api } from "@/lib/api";

/** Backed by GET/POST/DELETE /saved-exam-views/ — scoped server-side to the
 * logged-in admin, so this list is genuinely per-user, not shared/global. */
export default function SavedViewsPanel({ views, filters, onApply, onSaved, pushToast }) {
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/saved-exam-views/", { name: name.trim(), filters });
      setName("");
      setNaming(false);
      pushToast?.("View saved.");
      onSaved?.();
    } catch (err) {
      pushToast?.(err.message || "Could not save this view.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await api.del(`/saved-exam-views/${id}/`);
      onSaved?.();
    } catch (err) {
      pushToast?.(err.message || "Could not delete this view.", "error");
    }
  }

  return (
    <div className="hm-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Saved Views</p>
        <button type="button" onClick={() => setNaming((v) => !v)} className="text-xs font-semibold text-brand-blue">
          {naming ? "Cancel" : "+ Save current"}
        </button>
      </div>

      {naming && (
        <div className="mt-2 flex gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CEE-MBBS Draft Exams"
            className="hm-input text-xs"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button type="button" onClick={save} disabled={saving || !name.trim()} className="hm-btn-primary text-xs disabled:opacity-50">
            Save
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1">
        {views.length === 0 && <p className="text-xs italic text-[var(--color-text-muted)]">No saved views yet.</p>}
        {views.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 hover:bg-[var(--color-surface-muted)]">
            <button type="button" onClick={() => onApply(v.filters)} className="flex-1 truncate text-left text-xs font-semibold text-[var(--color-text)]">
              ⭐ {v.name}
            </button>
            <button
              type="button"
              onClick={() => remove(v.id)}
              aria-label={`Delete saved view ${v.name}`}
              className="flex-none text-xs text-[var(--color-text-muted)] hover:text-brand-red"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
