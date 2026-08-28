"use client";

/** Chrome-only wizard shell (step indicator + Back/Next/Save) — step content
 * itself is built by the caller (exam-management/page.js), reusing the same
 * field blocks the old single ExamBuilderModal tabs already used. Editing an
 * existing exam still uses ExamBuilderModal's free tab bar (no gating
 * needed there — the exam's program/type are already implicitly set via its
 * existing course assignment); this shell is Create-only, where the spec
 * requires Program to be chosen before anything else. */
export default function CreateExamWizardShell({ steps, activeIndex, onStepChange, canAdvance, onCancel, onSave, saving, error }) {
  const step = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  function goNext() {
    if (!canAdvance(activeIndex)) return;
    if (isLast) {
      onSave(true);
    } else {
      onStepChange(activeIndex + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="hm-card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create Exam"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--color-text)]">Create Exam</h2>
          <button onClick={onCancel} aria-label="Cancel" className="hm-btn-outline text-xs">
            Cancel
          </button>
        </div>

        <ol className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-5 py-3" aria-label="Wizard steps">
          {steps.map((s, i) => (
            <li key={s.key} className="flex flex-none items-center gap-1">
              <button
                type="button"
                onClick={() => i < activeIndex && onStepChange(i)}
                disabled={i > activeIndex}
                aria-current={i === activeIndex ? "step" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  i === activeIndex
                    ? "bg-brand-blue text-white"
                    : i < activeIndex
                      ? "bg-brand-green-light text-brand-green"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                }`}
              >
                <span aria-hidden>{i < activeIndex ? "✓" : i + 1}</span>
                {s.label}
              </button>
              {i < steps.length - 1 && <span className="text-[var(--color-text-muted)]" aria-hidden>→</span>}
            </li>
          ))}
        </ol>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 rounded-lg bg-brand-red-light px-3 py-2 text-xs font-medium text-brand-red">{error}</p>}
          {step?.content}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <button type="button" onClick={() => onStepChange(activeIndex - 1)} disabled={isFirst} className="hm-btn-outline disabled:opacity-40">
            ← Back
          </button>
          <button type="button" onClick={goNext} disabled={saving || !canAdvance(activeIndex)} className="hm-btn-primary disabled:opacity-50">
            {isLast ? (saving ? "Saving…" : "Create Exam") : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
