"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DistributionPreviewStep({ batch, config, creating, onCreate, onBack }) {
  const [taxonomy, setTaxonomy] = useState(null);
  const [courseNames, setCourseNames] = useState([]);

  useEffect(() => {
    async function load() {
      const [subjects, chapter, topic, courses] = await Promise.all([
        api.get("/subjects/"),
        batch.chapter_id ? api.get(`/chapters/${batch.chapter_id}/`) : Promise.resolve(null),
        batch.topic_id ? api.get(`/topics/${batch.topic_id}/`) : Promise.resolve(null),
        api.get("/courses/"),
      ]);
      const subject = subjects.find((s) => s.id === batch.subject_id);
      setTaxonomy({ subject, chapter, topic });
      setCourseNames((config.courses || []).map((id) => courses.find((c) => c.id === id)?.name).filter(Boolean));
    }
    load();
  }, [batch.id, batch.subject_id, batch.chapter_id, batch.topic_id, config.courses]);

  const counts = batch.row_counts || {};
  const eligible = (counts.valid || 0) + (counts.warning || 0) + (counts.duplicate || 0);
  const skipped = counts.error || 0;

  const shuffleLabel = [config.shuffle_questions && "Questions", config.shuffle_options && "Options"].filter(Boolean).join(" + ") || "Off";

  return (
    <div className="flex flex-col gap-4">
      <div className="hm-card p-4">
        <p className="text-sm font-bold text-[var(--color-text)]">Test Distribution Preview</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Review before creating — nothing is saved until you click Create Test.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Questions to import</p>
            <p className="text-lg font-extrabold text-brand-green">{eligible}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Skipped (errors)</p>
            <p className="text-lg font-extrabold text-[var(--color-text-muted)]">{skipped}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Duplicates resolved</p>
            <p className="text-lg font-extrabold text-purple-700">{counts.duplicate || 0}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Total marks (default)</p>
            <p className="text-lg font-extrabold text-[var(--color-text)]">{eligible}</p>
          </div>
        </div>

        {taxonomy && (
          <p className="mt-4 text-sm text-[var(--color-text)]">
            <span className="font-semibold">Subject → Chapter → Topic:</span> {taxonomy.subject?.name || "—"} →{" "}
            {taxonomy.chapter?.name || "—"} → {taxonomy.topic?.name || "—"}
          </p>
        )}
        <p className="mt-1 text-sm text-[var(--color-text)]">
          <span className="font-semibold">Courses:</span>{" "}
          {courseNames.length ? courseNames.join(", ") : "Visible to every enrolled student"}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)] sm:grid-cols-3">
          <p>
            <span className="font-semibold text-[var(--color-text)]">Title:</span> {config.title}
          </p>
          <p>
            <span className="font-semibold text-[var(--color-text)]">Type:</span> {config.exam_type}
          </p>
          <p>
            <span className="font-semibold text-[var(--color-text)]">Duration:</span> {config.duration_minutes} min
          </p>
          <p>
            <span className="font-semibold text-[var(--color-text)]">Negative marking:</span> {config.negative_marking ? "On" : "Off"}
          </p>
          <p>
            <span className="font-semibold text-[var(--color-text)]">Shuffle:</span> {shuffleLabel}
          </p>
          <p>
            <span className="font-semibold text-[var(--color-text)]">Status:</span>{" "}
            {config.is_draft ? "Draft (staff only)" : "Publish immediately"}
          </p>
        </div>
      </div>

      {skipped > 0 && (
        <p className="text-xs font-medium text-yellow-700">
          {skipped} question(s) with unresolved errors will be skipped and not added to the test.
        </p>
      )}
      {eligible === 0 && (
        <p className="text-sm font-medium text-brand-red">No eligible questions — go back and resolve the errors first.</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onBack} className="hm-btn-outline">
          Back
        </button>
        <button onClick={onCreate} disabled={creating || eligible === 0} className="hm-btn-primary">
          {creating ? "Creating…" : `Create Test (${eligible} questions)`}
        </button>
      </div>
    </div>
  );
}
