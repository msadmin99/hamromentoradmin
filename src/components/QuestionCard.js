"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PreviewModal from "./richeditor/PreviewModal";
import RichEditor from "./richeditor/RichEditor";
import { videoEmbedUrl } from "./richeditor/uploadMedia";

const REFERENCE_TYPES = [
  { key: "book", label: "Book" },
  { key: "paper", label: "Research Paper" },
  { key: "video", label: "YouTube Video" },
  { key: "link", label: "Link" },
];

// Drives image-quality profile on the backend (media_library) — "Auto" lets
// the server use a sensible default; picking a specific category (e.g.
// X-ray) tells the optimizer to preserve more detail than a typical diagram.
const IMAGE_CATEGORIES = [
  { key: "other", label: "Auto" },
  { key: "diagram", label: "Diagram" },
  { key: "photograph", label: "Photograph" },
  { key: "xray", label: "X-ray" },
  { key: "ct_mri", label: "CT / MRI" },
  { key: "histology", label: "Histology" },
  { key: "ecg", label: "ECG" },
  { key: "screenshot_table", label: "Screenshot / Table" },
];

export function emptyOption() {
  // latex/image are kept (unused by this editor) purely so any legacy value —
  // e.g. from the Excel bulk-import flow — survives an edit-save untouched
  // rather than being silently wiped when this option round-trips through save().
  return { text: "", latex: "", image: null, image_category: "other", is_correct: false, explanation: "" };
}

// Independent of actual_difficulty (computed from real student performance,
// read-only — see the Smart Question Bank dashboard's difficulty analytics).
// Keys match academics.models.Question.DIFFICULTY_CHOICES on the backend.
const DIFFICULTY_OPTIONS = [
  { key: "", label: "Not set" },
  { key: "very_easy", label: "Very Easy" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Moderate" },
  { key: "hard", label: "Difficult" },
  { key: "very_hard", label: "Very Difficult" },
];
const DIFFICULTY_LABEL = Object.fromEntries(DIFFICULTY_OPTIONS.map((d) => [d.key, d.label]));

const QUESTION_TYPE_OPTIONS = [
  { key: "", label: "Not set" },
  { key: "conceptual", label: "Conceptual" },
  { key: "recall", label: "Recall" },
  { key: "clinical", label: "Clinical" },
  { key: "numerical", label: "Numerical" },
  { key: "image_based", label: "Image-based" },
  { key: "other", label: "Other" },
];

export function emptyQuestion() {
  return {
    marks: 1,
    negative_marks: 0.25,
    text: "",
    latex: "",
    image: null,
    image_category: "other",
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
    explanation: "",
    explanation_latex: "",
    explanation_image: null,
    explanation_image_category: "other",
    explanation_video_url: "",
    references: [],
    key_takeaway: "",
    reference_book: null,
    reference_edition: "",
    reference_chapter: "",
    reference_page: "",
    reference_url: "",
    remarks: "",
    past_exam_years: "",
    instructor_difficulty: "",
    question_type: "",
    tags: [],
  };
}

function isExistingImage(value) {
  return typeof value === "string" && value.length > 0;
}

export function ImagePicker({ label, value, onChange }) {
  const hasExisting = isExistingImage(value);
  const hasNewFile = value instanceof File;

  return (
    <div className="flex items-center gap-2">
      {hasExisting && !hasNewFile && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-8 w-8 flex-none rounded-md border border-[var(--color-border)] object-cover" />
      )}
      <label className="hm-btn-outline inline-flex cursor-pointer items-center gap-1.5 text-xs">
        🖼 {hasNewFile ? value.name.slice(0, 18) : hasExisting ? "Change image" : label}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
      {(hasExisting || hasNewFile) && (
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-brand-red">
          Remove
        </button>
      )}
    </div>
  );
}

/** ImagePicker + an "Auto/X-ray/ECG/…" category selector, shown together
 * wherever a question/option/explanation image can be attached. `value`/
 * `categoryValue` and their `onChange`s are kept as separate props (rather
 * than one combined object) so this drops straight into the existing
 * `image`/`image_category` question-state fields. */
// Sentinel stored in question/option state when the admin removes a
// *previously-saved* image — distinguishes "explicitly cleared, persist that
// on save" from "never had one" (plain null/absent), since the save payload
// otherwise has no way to tell the backend to clear an existing image.
export const IMAGE_REMOVED = "__REMOVED__";

function QuestionImagePicker({ label, value, onChange, categoryValue, onCategoryChange }) {
  const isRemoved = value === IMAGE_REMOVED;
  const hasImage = !isRemoved && (value instanceof File || (typeof value === "string" && value.length > 0));

  function handlePickerChange(next) {
    // ImagePicker's "Remove" button always calls onChange(null); only turn
    // that into the persisted-removal sentinel if there was a real
    // *existing* (saved) image to remove — clearing a not-yet-saved File
    // pick is a plain no-op, nothing to tell the backend.
    if (next === null && typeof value === "string" && value.length > 0) {
      onChange(IMAGE_REMOVED);
    } else {
      onChange(next);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ImagePicker label={label} value={isRemoved ? null : value} onChange={handlePickerChange} />
      {hasImage && (
        <select
          value={categoryValue || "other"}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="hm-input w-auto text-xs"
          title="Image category — affects optimization quality"
        >
          {IMAGE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function websiteDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const REFERENCE_LABEL_META = {
  book: { fieldLabel: "Book name", placeholder: "e.g. Guyton and Hall Textbook of Medical Physiology, 14th ed." },
  paper: { fieldLabel: "Paper title", placeholder: "e.g. Smith et al., \"Cardiac Cycle Dynamics\", NEJM 2021" },
  video: { fieldLabel: "Title", placeholder: "e.g. Cardiac Cycle Explained" },
  link: { fieldLabel: "Title", placeholder: "e.g. Cardiac Cycle — overview" },
};

function ReferenceRow({ reference, onChange, onRemove }) {
  const isBook = reference.type === "book";
  const meta = REFERENCE_LABEL_META[reference.type] || REFERENCE_LABEL_META.link;
  const embedUrl = reference.type === "video" ? videoEmbedUrl(reference.url) : null;
  const domain = reference.type === "link" ? websiteDomain(reference.url) : "";

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between">
        <div className="w-40">
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Reference type</label>
          <select
            value={reference.type}
            onChange={(e) => onChange({ ...reference, type: e.target.value })}
            className="hm-input text-xs"
          >
            {REFERENCE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={onRemove} className="flex-none text-xs font-semibold text-brand-red">
          Remove
        </button>
      </div>

      <div className="mt-2">
        <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">{meta.fieldLabel}</label>
        <input
          type="text"
          value={reference.label}
          onChange={(e) => onChange({ ...reference, label: e.target.value })}
          placeholder={meta.placeholder}
          className="hm-input w-full text-xs"
        />
      </div>

      {!isBook && (
        <div className="mt-2">
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            {reference.type === "video" ? "YouTube / Vimeo link" : reference.type === "paper" ? "Link to the paper (optional)" : "Website URL"}
          </label>
          <input
            type="text"
            value={reference.url}
            onChange={(e) => onChange({ ...reference, url: e.target.value })}
            placeholder={reference.type === "video" ? "https://youtu.be/…" : "https://…"}
            className="hm-input w-full text-xs"
          />
          {reference.type === "video" && reference.url && (
            <div className="mt-1.5 aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-black">
              {embedUrl ? (
                <iframe src={embedUrl} title="Reference video preview" className="h-full w-full" allowFullScreen />
              ) : (
                <p className="flex h-full items-center justify-center px-2 text-center text-[10px] text-white/70">
                  Couldn&apos;t recognize this as a YouTube/Vimeo link — it will still be saved as a plain link.
                </p>
              )}
            </div>
          )}
          {reference.type === "link" && reference.url && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-[var(--color-surface-muted)] px-2 py-1.5 text-xs text-[var(--color-text-muted)]">
              🔗 {domain || "Enter a full URL, e.g. https://example.com/article"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReferenceBookPicker({ value, onChange }) {
  const [books, setBooks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api.get("/reference-books/").then(setBooks).catch(() => {});
  }, []);

  async function handleSelect(e) {
    const v = e.target.value;
    if (v === "__new__") {
      setCreating(true);
      return;
    }
    onChange(v ? Number(v) : null);
  }

  async function saveNewBook() {
    if (!newName.trim()) return;
    const book = await api.post("/reference-books/", { name: newName.trim() });
    setBooks((b) => [...b, book]);
    onChange(book.id);
    setCreating(false);
    setNewName("");
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New book name"
          className="hm-input flex-1 text-xs"
        />
        <button type="button" onClick={saveNewBook} className="hm-btn-primary px-2 py-1.5 text-xs">
          Add
        </button>
        <button type="button" onClick={() => setCreating(false)} className="text-xs font-semibold text-[var(--color-text-muted)]">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select value={value || ""} onChange={handleSelect} className="hm-input text-xs">
      <option value="">Not set</option>
      {books.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
      <option value="__new__">+ Add a new book…</option>
    </select>
  );
}

export default function QuestionCard({ index, question, onChange, onRemove, canRemove }) {
  const [showPreview, setShowPreview] = useState(false);

  function update(patch) {
    onChange({ ...question, ...patch });
  }
  function updateOption(i, patch) {
    const options = question.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    update({ options });
  }
  function markCorrect(i) {
    update({ options: question.options.map((o, idx) => ({ ...o, is_correct: idx === i })) });
  }

  const references = question.references || [];
  function updateReference(i, next) {
    update({ references: references.map((r, idx) => (idx === i ? next : r)) });
  }
  function addReference() {
    update({ references: [...references, { type: "book", label: "", url: "" }] });
  }
  function removeReference(i) {
    update({ references: references.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="hm-card p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue">Question {index + 1}</span>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[var(--color-text-muted)]">Marks</label>
          <input
            type="number"
            step="0.25"
            value={question.marks}
            onChange={(e) => update({ marks: e.target.value })}
            className="hm-input w-20"
          />
          <label className="text-xs font-semibold text-[var(--color-text-muted)]">Negative</label>
          <input
            type="number"
            step="0.25"
            value={question.negative_marks}
            onChange={(e) => update({ negative_marks: e.target.value })}
            className="hm-input w-20"
          />
          <button type="button" onClick={() => setShowPreview(true)} className="hm-btn-outline text-xs">
            👁 Preview
          </button>
          {canRemove && (
            <button type="button" onClick={onRemove} className="text-xs font-semibold text-brand-red">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Question</label>
        <RichEditor value={question.text} onChange={(html) => update({ text: html })} placeholder="Question text" />
        <div className="mt-2">
          <QuestionImagePicker
            label="Add question image"
            value={question.image}
            onChange={(v) => update({ image: v })}
            categoryValue={question.image_category}
            onCategoryChange={(v) => update({ image_category: v })}
          />
        </div>
      </div>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Options — pick the correct one
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 ${opt.is_correct ? "border-brand-green bg-brand-green-light" : "border-[var(--color-border)]"}`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => markCorrect(i)}
                className={`mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  opt.is_correct ? "bg-brand-green text-white" : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <div className="min-w-0 flex-1">
                <RichEditor
                  value={opt.text}
                  onChange={(html) => updateOption(i, { text: html })}
                  placeholder={`Option ${i + 1}${opt.is_correct ? " (correct)" : ""}`}
                  minHeight={60}
                />
                <div className="mt-1.5">
                  <QuestionImagePicker
                    label="Add option image"
                    value={opt.image}
                    onChange={(v) => updateOption(i, { image: v })}
                    categoryValue={opt.image_category}
                    onCategoryChange={(v) => updateOption(i, { image_category: v })}
                  />
                </div>
                <input
                  value={opt.explanation || ""}
                  onChange={(e) => updateOption(i, { explanation: e.target.value })}
                  placeholder={opt.is_correct ? "Why this is right (optional)" : "Why this is wrong (optional) — shown to students after they answer"}
                  className="hm-input mt-1.5 w-full text-xs"
                />
                {opt.pick_percentage != null && (
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    {opt.pick_count ?? 0} pick{opt.pick_count === 1 ? "" : "s"} ({opt.pick_percentage}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[var(--color-surface-muted)] p-3">
        <p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Solution (optional)</p>
        <RichEditor
          value={question.explanation}
          onChange={(html) => update({ explanation: html })}
          placeholder="Explanation — text, equations, tables, images, video…"
        />
        <div className="mt-2">
          <QuestionImagePicker
            label="Add explanation image"
            value={question.explanation_image}
            onChange={(v) => update({ explanation_image: v })}
            categoryValue={question.explanation_image_category}
            onCategoryChange={(v) => update({ explanation_image_category: v })}
          />
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
            References — books, research papers, or YouTube links backing this explanation
          </p>
          <div className="flex flex-col gap-1.5">
            {references.map((ref, i) => (
              <ReferenceRow key={i} reference={ref} onChange={(next) => updateReference(i, next)} onRemove={() => removeReference(i)} />
            ))}
          </div>
          <button type="button" onClick={addReference} className="hm-btn-outline mt-1.5 text-xs">
            + Add reference
          </button>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Key Takeaway (optional)</label>
          <input
            value={question.key_takeaway || ""}
            onChange={(e) => update({ key_takeaway: e.target.value })}
            placeholder="One high-yield exam point shown after the explanation"
            className="hm-input w-full text-xs"
          />
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
            Primary Reference (optional) — rendered in its own card, separate from the links above
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Book</label>
              <ReferenceBookPicker value={question.reference_book} onChange={(v) => update({ reference_book: v })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Edition</label>
              <input
                value={question.reference_edition || ""}
                onChange={(e) => update({ reference_edition: e.target.value })}
                placeholder="e.g. 10th"
                className="hm-input text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Chapter</label>
              <input
                value={question.reference_chapter || ""}
                onChange={(e) => update({ reference_chapter: e.target.value })}
                placeholder="e.g. Hemodynamic Disorders"
                className="hm-input text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Page</label>
              <input
                value={question.reference_page || ""}
                onChange={(e) => update({ reference_page: e.target.value })}
                placeholder="e.g. 245 or 245-247"
                className="hm-input text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">URL (optional)</label>
              <input
                value={question.reference_url || ""}
                onChange={(e) => update({ reference_url: e.target.value })}
                placeholder="https://…"
                className="hm-input text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Remarks (optional)</label>
          <input value={question.remarks} onChange={(e) => update({ remarks: e.target.value })} className="hm-input" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            Past exam years BS (optional)
          </label>
          <input
            value={question.past_exam_years}
            onChange={(e) => update({ past_exam_years: e.target.value })}
            placeholder="e.g. 2078, 2080"
            className="hm-input"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            Instructor Difficulty
          </label>
          <select
            value={question.instructor_difficulty || ""}
            onChange={(e) => update({ instructor_difficulty: e.target.value })}
            className="hm-input"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          {question.actual_difficulty && (
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              Actual (from {question.actual_difficulty_sample_size} attempts): <span className="font-semibold">{DIFFICULTY_LABEL[question.actual_difficulty] || question.actual_difficulty}</span>
            </p>
          )}
          {question.total_attempts > 0 && (
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              {question.total_attempts} student{question.total_attempts === 1 ? "" : "s"} answered ·{" "}
              {Math.round((question.correct_attempts / question.total_attempts) * 100)}% correct
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Question Type</label>
          <select
            value={question.question_type || ""}
            onChange={(e) => update({ question_type: e.target.value })}
            className="hm-input"
          >
            {QUESTION_TYPE_OPTIONS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            Tags (comma-separated, optional)
          </label>
          <input
            value={(question.tags || []).join(", ")}
            onChange={(e) => update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="e.g. vector, scalar"
            className="hm-input"
          />
        </div>
      </div>

      {showPreview && <PreviewModal question={question} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
