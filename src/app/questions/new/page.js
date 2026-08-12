"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QuestionCard, { emptyQuestion } from "@/components/QuestionCard";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { useAutosaveDraft } from "@/components/richeditor/useAutosaveDraft";
import { api } from "@/lib/api";
import { uploadQuestionImages } from "@/lib/mediaUpload";

function ManualEntryContent() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedCourses, setSelectedCourses] = useState([]);
  const [subject, setSubject] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(""); // Chapter model — shown to admins as "Unit"
  const [selectedChapter, setSelectedChapter] = useState(""); // Topic model — shown to admins as "Chapter"

  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  const { restoredDraft, clearDraft, dismissDraft } = useAutosaveDraft("question_draft_new", questions);

  useEffect(() => {
    api.get("/courses/").then(setCourses);
    api.get("/subjects/").then(setSubjects);
  }, []);

  useEffect(() => {
    setSelectedUnit("");
    setSelectedChapter("");
    setTopics([]);
    const subj = subjects.find((s) => s.id === Number(subject));
    if (subj) {
      api.get(`/chapters/?subject=${subj.slug}`).then(setChapters);
    } else {
      setChapters([]);
    }
  }, [subject, subjects]);

  useEffect(() => {
    setSelectedChapter("");
    const ch = chapters.find((c) => c.id === Number(selectedUnit));
    setTopics(ch?.topics || []);
  }, [selectedUnit, chapters]);

  function updateQuestion(i, next) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? next : q)));
  }
  function removeQuestion(i) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }
  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  async function saveAll(e) {
    e.preventDefault();
    setError("");
    if (!subject) {
      setError("Select a subject.");
      return;
    }
    if (questions.some((q) => !q.options.some((o) => o.is_correct))) {
      setError("Every question needs a correct option marked.");
      return;
    }

    setSaving(true);
    try {
      for (let i = 0; i < questions.length; i++) {
        setProgress(`Saving question ${i + 1} of ${questions.length}…`);
        const q = questions[i];
        const payload = {
          subject: Number(subject),
          chapter: selectedUnit ? Number(selectedUnit) : null,
          topic: selectedChapter ? Number(selectedChapter) : null,
          courses: selectedCourses.map(Number),
          text: q.text,
          latex: q.latex,
          marks: q.marks,
          negative_marks: q.negative_marks,
          remarks: q.remarks,
          past_exam_years: q.past_exam_years,
          explanation: q.explanation,
          explanation_latex: q.explanation_latex,
          explanation_video_url: q.explanation_video_url,
          references: q.references || [],
          options: q.options.map((o, idx) => ({ text: o.text, latex: o.latex, is_correct: o.is_correct, order: idx })),
        };
        const created = await api.post("/questions/", payload);
        const hasImages = q.image instanceof File || q.explanation_image instanceof File || q.options.some((o) => o.image instanceof File);
        if (hasImages) {
          setProgress(`Optimizing images for question ${i + 1} of ${questions.length}…`);
          await uploadQuestionImages(api, created.id, q);
        }
      }
      clearDraft();
      router.push("/questions");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  return (
    <div className="pb-24">
      <div className="p-6">
        <a href="/questions" className="text-xs font-semibold text-brand-blue">
          ← Back to Question Entry
        </a>
        <h1 className="mt-2 text-xl font-bold text-[var(--color-text)]">Manual Question Entry</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Pick the course/subject/unit/chapter once, then add as many questions as you like — they all share that same taxonomy.
        </p>

        {restoredDraft && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
            <span className="text-amber-800">An unsaved draft was found from a previous session.</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuestions(restoredDraft);
                  dismissDraft();
                }}
                className="hm-btn-primary px-3 py-1.5 text-xs"
              >
                Restore draft
              </button>
              <button type="button" onClick={clearDraft} className="hm-btn-outline px-3 py-1.5 text-xs">
                Discard
              </button>
            </div>
          </div>
        )}

        <form onSubmit={saveAll}>
          <div className="mt-5 hm-card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Applies to every question below
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Course(s)</label>
              <select
                multiple
                value={selectedCourses}
                onChange={(e) => setSelectedCourses(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="hm-input h-24"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Ctrl/Cmd-click to select multiple.</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Subject</label>
                <select required value={subject} onChange={(e) => setSubject(e.target.value)} className="hm-input">
                  <option value="">Select a subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Unit</label>
                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="hm-input" disabled={!chapters.length}>
                  <option value="">Select a unit</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Chapter</label>
                <select value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)} className="hm-input" disabled={!topics.length}>
                  <option value="">Select a chapter</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                index={i}
                question={q}
                onChange={(next) => updateQuestion(i, next)}
                onRemove={() => removeQuestion(i)}
                canRemove={questions.length > 1}
              />
            ))}
          </div>

          <button type="button" onClick={addQuestion} className="hm-btn-outline mt-4">
            + Add another question
          </button>

          {error && <p className="mt-4 text-sm font-medium text-brand-red">{error}</p>}

          <div className="fixed bottom-0 left-64 right-0 flex items-center justify-between border-t border-[var(--color-border)] bg-white px-6 py-3">
            <span className="text-sm text-[var(--color-text-muted)]">
              {saving ? progress : `${questions.length} question${questions.length === 1 ? "" : "s"} ready to save`}
            </span>
            <button type="submit" disabled={saving} className="hm-btn-primary">
              {saving ? "Saving…" : `Save ${questions.length} question${questions.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManualEntryPage() {
  return (
    <RequireStaff feature="question_entry">
      <Shell>
        <ManualEntryContent />
      </Shell>
    </RequireStaff>
  );
}
