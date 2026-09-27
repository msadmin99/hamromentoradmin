"use client";

import { renderStudentHtml } from "@/lib/studentHtml";
import Modal from "@/components/Modal";

const REFERENCE_ICONS = { book: "📖", paper: "📄", video: "🎥", link: "🔗" };

/** The preview uses the SAME renderer as the student page (renderStudentHtml =
 * richHtml -> mathDelimiters -> trivialMath -> KaTeX -> DOMPurify), so every
 * delimiter style students see rendered — $…$, $$…$$, \(…\), \[…\] and the
 * malformed nested forms — renders identically here. */
export default function PreviewModal({ question, onClose }) {
  return (
    <Modal title="Preview — exactly what students will see" onClose={onClose} wide>
      <p className="mb-3 text-xs font-semibold text-[var(--color-text-muted)]">
        {question.marks} mark{Number(question.marks) === 1 ? "" : "s"} · −{question.negative_marks} for wrong answer
      </p>

      <div className="hm-richtext-content text-[15px] font-medium leading-relaxed text-[var(--color-text)]" dangerouslySetInnerHTML={{ __html: renderStudentHtml(question.text) || "<p><em>Empty question</em></p>" }} />

      <div className="mt-4 flex flex-col gap-2.5">
        {question.options.map((opt, i) => (
          <div
            key={i}
            className={`flex gap-1.5 rounded-xl border px-4 py-3 text-sm ${
              opt.is_correct ? "border-brand-green bg-brand-green-light" : "border-[var(--color-border)]"
            }`}
          >
            <span className="flex-none font-semibold text-[var(--color-text)]">{String.fromCharCode(65 + i)})</span>
            <div className="hm-richtext-content min-w-0 flex-1 text-[var(--color-text)]" dangerouslySetInnerHTML={{ __html: renderStudentHtml(opt.text) }} />
            {opt.is_correct && <span className="flex-none text-xs font-bold text-brand-green">✓ Correct</span>}
          </div>
        ))}
      </div>

      {question.explanation && (
        <div className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Explanation</p>
          <div
            className="hm-richtext-content text-sm leading-relaxed text-[var(--color-text-muted)]"
            dangerouslySetInnerHTML={{ __html: renderStudentHtml(question.explanation) }}
          />
          {question.references?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">References</p>
              <ul className="flex flex-col gap-1">
                {question.references.map((ref, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <span>{REFERENCE_ICONS[ref.type] || "🔗"}</span>
                    <span>{ref.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
