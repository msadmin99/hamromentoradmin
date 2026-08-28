"use client";

import { useState } from "react";
import PreviewModal from "@/components/richeditor/PreviewModal";
import QuestionCard, { IMAGE_REMOVED } from "@/components/QuestionCard";
import { api } from "@/lib/api";
import { uploadQuestionImages } from "@/lib/mediaUpload";
import { stripHtml } from "@/lib/richtext";

/** Maps a GET /questions/{id}/ response into the exact shape QuestionCard
 * expects — same mapping Admin/src/app/questions/page.js's openEdit() uses,
 * minus subject/chapter/topic/courses (this editor only touches question
 * CONTENT — text/options/explanation — never re-categorizes a question;
 * omitting those fields from the save payload leaves them untouched,
 * confirmed via QuestionAdminSerializer.update()'s is-not-None guards). */
function mapToCardShape(q) {
  return {
    marks: q.marks,
    negative_marks: q.negative_marks,
    text: q.text || "",
    latex: q.latex || "",
    image: q.image || null,
    image_category: q.image_category || "other",
    options: (q.options || []).map((o) => ({
      text: o.text, latex: o.latex || "", image: o.image || null, image_category: o.image_category || "other",
      is_correct: o.is_correct, explanation: o.explanation || "",
      pick_count: o.pick_count, pick_percentage: o.pick_percentage,
    })),
    explanation: q.explanation || "",
    explanation_latex: q.explanation_latex || "",
    explanation_image: q.explanation_image || null,
    explanation_image_category: q.explanation_image_category || "other",
    explanation_video_url: q.explanation_video_url || "",
    references: q.references || [],
    key_takeaway: q.key_takeaway || "",
    reference_book: q.reference_book || null,
    reference_edition: q.reference_edition || "",
    reference_chapter: q.reference_chapter || "",
    reference_page: q.reference_page || "",
    reference_url: q.reference_url || "",
    remarks: q.remarks || "",
    past_exam_years: q.past_exam_years || "",
    instructor_difficulty: q.instructor_difficulty || "",
    actual_difficulty: q.actual_difficulty || "",
    actual_difficulty_sample_size: q.actual_difficulty_sample_size || 0,
    total_attempts: q.total_attempts || 0,
    correct_attempts: q.correct_attempts || 0,
    question_type: q.question_type || "",
    tags: q.tags || [],
  };
}

function buildPayload(data) {
  return {
    text: data.text,
    latex: data.latex,
    marks: data.marks,
    negative_marks: data.negative_marks,
    remarks: data.remarks,
    past_exam_years: data.past_exam_years,
    instructor_difficulty: data.instructor_difficulty || "",
    question_type: data.question_type || "",
    tags: data.tags || [],
    explanation: data.explanation,
    explanation_latex: data.explanation_latex,
    explanation_video_url: data.explanation_video_url,
    references: data.references || [],
    key_takeaway: data.key_takeaway || "",
    reference_book: data.reference_book || null,
    reference_edition: data.reference_edition || "",
    reference_chapter: data.reference_chapter || "",
    reference_page: data.reference_page || "",
    reference_url: data.reference_url || "",
    options: data.options.map((o, i) => ({
      text: o.text, latex: o.latex, is_correct: o.is_correct, order: i, explanation: o.explanation || "",
    })),
  };
}

function QuestionRow({ question, onRemove, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  async function toggleExpand() {
    if (!expanded && !editData) {
      setLoading(true);
      try {
        const q = await api.get(`/questions/${question.id}/`);
        setEditData(mapToCardShape(q));
      } finally {
        setLoading(false);
      }
    }
    setExpanded((e) => !e);
    setError("");
  }

  async function save() {
    if (!editData.options.some((o) => o.is_correct)) {
      setError("Mark one option as the correct answer.");
      return;
    }
    if (editData.options.some((o) => !o.text.trim())) {
      setError("All options need text.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patch(`/questions/${question.id}/`, buildPayload(editData));
      const imageChanged = (v) => v instanceof File || v === IMAGE_REMOVED;
      const hasNewImages = imageChanged(editData.image) || imageChanged(editData.explanation_image) || editData.options.some((o) => imageChanged(o.image));
      if (hasNewImages) await uploadQuestionImages(api, question.id, editData);
      const fresh = await api.get(`/questions/${question.id}/`);
      onSaved(fresh);
      setEditData(mapToCardShape(fresh));
      setExpanded(false);
    } catch (err) {
      setError(err.message || "Could not save this question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={toggleExpand} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="flex-none text-[var(--color-text-muted)]">{expanded ? "▲" : "▼"}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text)]">{stripHtml(question.text) || "(blank question)"}</span>
        </button>
        <button type="button" onClick={() => setShowPreview(true)} className="flex-none text-xs font-semibold text-brand-blue">
          👁 Preview
        </button>
        <button type="button" onClick={onRemove} className="flex-none text-xs font-semibold text-brand-red">
          Remove
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
          {loading && <p className="text-xs text-[var(--color-text-muted)]">Loading question…</p>}
          {!loading && editData && (
            <>
              <QuestionCard index={0} question={editData} onChange={setEditData} canRemove={false} />
              {error && <p className="mt-2 text-xs font-medium text-brand-red">{error}</p>}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setExpanded(false)} className="hm-btn-outline text-xs">
                  Cancel
                </button>
                <button type="button" onClick={save} disabled={saving} className="hm-btn-primary text-xs disabled:opacity-60">
                  {saving ? "Saving…" : "Save Question"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showPreview && <PreviewModal question={question} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

/** Replaces the old raw-HTML-text "Remove"-only rows in the exam form's
 * Questions list with real edit-in-place (reusing QuestionCard, the same
 * full question editor Admin/src/app/questions/page.js already uses) and a
 * real MCQ preview (reusing PreviewModal, unchanged). Edits PATCH the real,
 * persisted Question — shared across every exam type (Daily/Mock/Grand/PYQ/
 * Question Bank all build on the same Test model and this same Questions
 * list component), not a draft/staging copy. */
export default function QuestionListEditor({ questions, onRemove, onQuestionUpdated }) {
  if (questions.length === 0) {
    return <p className="p-3 text-xs italic text-[var(--color-text-muted)]">There are no questions yet.</p>;
  }
  return (
    <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-[var(--color-border)]">
      {questions.map((q) => (
        <QuestionRow key={q.id} question={q} onRemove={() => onRemove(q.id)} onSaved={onQuestionUpdated} />
      ))}
    </div>
  );
}
