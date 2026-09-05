"use client";

import { useState } from "react";
import PreviewStep from "@/components/import/PreviewStep";
import UploadStep from "@/components/import/UploadStep";
import { api } from "@/lib/api";

// Phase C — Bulk Import Questions into an existing exam. Reuses the
// existing import pipeline's UploadStep/PreviewStep completely unmodified
// (same upload, taxonomy, validation, duplicate-detection, LaTeX/image
// handling as every other import path); the only new piece is this
// workspace's own terminal step, which calls the Phase B endpoint
// (POST /import-batches/<id>/create-questions/) instead of either of the
// two existing terminal steps (Question Bank's async /confirm/, or Import
// & Create Test's TestConfigStep). Nothing here creates or touches a Test
// — it only ever returns question_ids for the caller to merge into its
// own in-memory question list; persistence stays exactly where it already
// was, in the existing Edit Exam Save -> PATCH /tests/{id}/ flow.
//
// `mode="create_test"` is passed to PreviewStep deliberately, not because
// a Test is being created — it's the one existing branch in PreviewStep's
// own handleConfirm() that defers to the caller (`onConfirmed(batch)`)
// instead of calling the Question-Bank-only /confirm/ endpoint itself, and
// it already includes the exact unresolved-duplicate-decision gate this
// workflow needs, unmodified.
const SUMMARY_LABELS = {
  valid: { label: "Valid", className: "text-brand-green" },
  warning: { label: "Warnings", className: "text-yellow-700" },
  duplicate: { label: "Duplicates resolved", className: "text-purple-700" },
  error: { label: "Skipped (errors)", className: "text-[var(--color-text-muted)]" },
};

function ImportSummaryStep({ batch, onBack, onImported, onCancel }) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [failedRowNumber, setFailedRowNumber] = useState(null);
  const [result, setResult] = useState(null); // { question_ids } once the backend call succeeds

  const counts = batch.row_counts || {};
  const eligible = (counts.valid || 0) + (counts.warning || 0) + (counts.duplicate || 0);

  async function handleImport() {
    setImporting(true);
    setError("");
    setFailedRowNumber(null);
    try {
      const data = await api.post(`/import-batches/${batch.id}/create-questions/`, {});
      setResult(data);
      // Bounded, single request — every imported question shares this
      // batch's own subject/chapter/topic (create_question_from_row sets
      // them uniformly), so the existing, already-used-by-QuestionPicker
      // taxonomy filter fetches exactly this pool in one call; filtering
      // to the returned IDs client-side avoids adding a new backend
      // filter param for this frontend-only phase.
      const idSet = new Set(data.question_ids);
      // /questions/ filters `subject` by slug, not id (matching every other
      // caller of this endpoint, e.g. QuestionPicker/DistributionPreviewStep)
      // — the batch summary only carries subject_id, so resolve it once via
      // the same small, already-cached-shape /subjects/ list those other
      // callers already fetch.
      const subjects = await api.get("/subjects/");
      const subjectSlug = subjects.find((s) => s.id === batch.subject_id)?.slug;
      const params = new URLSearchParams();
      if (subjectSlug) params.set("subject", subjectSlug);
      if (batch.chapter_id) params.set("chapter", String(batch.chapter_id));
      if (batch.topic_id) params.set("topic", String(batch.topic_id));
      const pool = await api.get(`/questions/?${params.toString()}`);
      const imported = (pool || []).filter((q) => idSet.has(q.id));
      onImported(imported);
    } catch (err) {
      setError(err.message || "Could not import these questions.");
      setFailedRowNumber(err.data?.failed_row_number ?? null);
    } finally {
      setImporting(false);
    }
  }

  if (result) {
    return (
      <div className="hm-card flex flex-col items-center gap-3 p-8 text-center">
        <span className="text-3xl">✅</span>
        <p className="text-sm font-bold text-[var(--color-text)]">
          {result.question_ids.length} question{result.question_ids.length === 1 ? "" : "s"} imported.
        </p>
        <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
          They&apos;ve been added to the Question Bank and to this exam&apos;s question list below — but they are not
          yet part of the saved exam. Click <span className="font-semibold text-[var(--color-text)]">Save</span> (or{" "}
          <span className="font-semibold text-[var(--color-text)]">Save and close</span>) to attach them permanently.
        </p>
        <button type="button" onClick={onCancel} className="hm-btn-primary mt-2">
          Done — back to Edit Exam
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hm-card p-4">
        <p className="text-sm font-bold text-[var(--color-text)]">Ready to add to this exam</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Nothing is added to the exam until you click the button below — and the exam itself isn&apos;t saved until
          you click Save afterward.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Questions to add</p>
            <p className="text-lg font-extrabold text-brand-green">{eligible}</p>
          </div>
          {Object.entries(SUMMARY_LABELS).map(([key, meta]) => (
            <div key={key}>
              <p className="text-xs text-[var(--color-text-muted)]">{meta.label}</p>
              <p className={`text-lg font-extrabold ${meta.className}`}>{counts[key] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {eligible === 0 && (
        <p className="text-sm font-medium text-brand-red">No eligible questions — go back and resolve the errors first.</p>
      )}
      {error && (
        <div className="rounded-lg bg-brand-red-light px-3 py-2 text-xs font-medium text-brand-red">
          {error}
          {failedRowNumber != null && ` (row ${failedRowNumber})`}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onBack} className="hm-btn-outline" disabled={importing}>
          Back
        </button>
        <button type="button" onClick={handleImport} disabled={importing || eligible === 0} className="hm-btn-primary">
          {importing ? "Adding…" : `Add to this exam (${eligible})`}
        </button>
      </div>
    </div>
  );
}

/**
 * `existingQuestionIds`: the exam's current in-memory question ID set —
 * used only to decide the wording of the success state, never to alter
 * what the backend imports.
 * `onImported(newQuestions)`: called once with the freshly-fetched,
 * already-deduped-against-the-exam Question objects to merge into
 * form.questions. The caller owns the actual merge + Save.
 * `onClose()`: closes the workspace without importing anything further.
 */
export default function BulkImportWorkspace({ onImported, onClose }) {
  const [step, setStep] = useState("upload"); // upload | preview | summary
  const [batch, setBatch] = useState(null);

  const steps = ["upload", "preview", "summary"];
  const labels = ["Upload", "Preview & Validate", "Add to Exam"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-4">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text)]">Bulk Import Questions</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Adds questions to this exam — Save is still required to keep them.</p>
        </div>
        <button type="button" onClick={onClose} className="hm-btn-outline">
          Cancel Import
        </button>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-white px-6 py-3 text-xs font-semibold text-[var(--color-text-muted)]">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 ${
                i === currentIndex
                  ? "bg-brand-blue text-white"
                  : currentIndex > i
                    ? "bg-brand-green-light text-brand-green"
                    : "bg-[var(--color-surface-muted)]"
              }`}
            >
              {currentIndex > i ? "✓ " : ""}
              {label}
            </span>
            {i < labels.length - 1 && <span>→</span>}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--color-surface-muted)] p-6">
        {step === "upload" && (
          <UploadStep
            importMode="create_test"
            onUploaded={(uploadedBatch) => {
              setBatch(uploadedBatch);
              setStep("preview");
            }}
          />
        )}
        {step === "preview" && batch && (
          <PreviewStep
            batch={batch}
            mode="create_test"
            onConfirmed={(confirmedBatch) => {
              setBatch(confirmedBatch);
              setStep("summary");
            }}
            onCancel={onClose}
          />
        )}
        {step === "summary" && batch && (
          <ImportSummaryStep
            batch={batch}
            onBack={() => setStep("preview")}
            onCancel={onClose}
            onImported={onImported}
          />
        )}
      </div>
    </div>
  );
}
