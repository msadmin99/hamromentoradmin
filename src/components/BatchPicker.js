"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Multi-select for course cohorts (e.g. "2082 Batch") — only meaningful
 * once at least one course is selected, since a batch always belongs to
 * exactly one course. `selectedCourses` is the list of {id, name} for the
 * exam's currently-selected courses (not every course in the system). */
export default function BatchPicker({ selectedCourses, selected, onChange }) {
  const courseIds = selectedCourses.map((c) => c.id);
  const [batches, setBatches] = useState([]);
  const [newBatchName, setNewBatchName] = useState("");
  const [creatingFor, setCreatingFor] = useState(courseIds[0] || "");

  function load() {
    if (courseIds.length === 0) {
      setBatches([]);
      return;
    }
    Promise.all(courseIds.map((id) => api.get(`/batches/?course=${id}`))).then((lists) => setBatches(lists.flat()));
    if (!courseIds.includes(Number(creatingFor))) setCreatingFor(courseIds[0]);
  }
  useEffect(load, [courseIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function createBatch() {
    if (!newBatchName.trim() || !creatingFor) return;
    const created = await api.post("/batches/", { course: Number(creatingFor), name: newBatchName.trim() });
    setNewBatchName("");
    setBatches((b) => [...b, created]);
    onChange([...selected, created.id]);
  }

  if (courseIds.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">Select at least one course above to assign a batch.</p>;
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      {batches.length > 0 ? (
        <div className="flex flex-col gap-1">
          {batches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
              <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} />
              {b.name} <span className="text-[var(--color-text-muted)]">({b.course_name}, {b.student_count} students)</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">No batches yet for the selected course(s).</p>
      )}
      <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-border)] pt-2">
        <select value={creatingFor} onChange={(e) => setCreatingFor(e.target.value)} className="hm-input text-xs">
          {selectedCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          value={newBatchName}
          onChange={(e) => setNewBatchName(e.target.value)}
          placeholder="e.g. 2082 Batch"
          className="hm-input text-xs"
        />
        <button type="button" onClick={createBatch} className="flex-none text-xs font-semibold text-brand-blue">
          + Add
        </button>
      </div>
    </div>
  );
}
