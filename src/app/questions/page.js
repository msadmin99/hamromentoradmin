"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Modal from "@/components/Modal";
import QuestionCard, { emptyQuestion, IMAGE_REMOVED } from "@/components/QuestionCard";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { uploadQuestionImages } from "@/lib/mediaUpload";
import { stripHtml } from "@/lib/richtext";

function QuestionsContent() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterUnit, setFilterUnit] = useState(""); // Chapter model — "Unit" in the UI
  const [filterChapter, setFilterChapter] = useState(""); // Topic model — "Chapter" in the UI
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterUnits, setFilterUnits] = useState([]);
  const [filterChapters, setFilterChapters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: "single", id } | { type: "bulk", ids }

  const [editCourses, setEditCourses] = useState([]);
  const [editSubject, setEditSubject] = useState("");
  const [editUnit, setEditUnit] = useState(""); // Chapter model — shown to admins as "Unit"
  const [editChapter, setEditChapter] = useState(""); // Topic model — shown to admins as "Chapter"
  const [editUnits, setEditUnits] = useState([]);
  const [editChapters, setEditChapters] = useState([]);
  const [question, setQuestion] = useState(emptyQuestion());

  useEffect(() => {
    api.get("/courses/").then(setCourses);
    api.get("/auth/teachers/").then(setTeachers).catch(() => {});
  }, []);

  // Subject options narrow to the selected course, if any.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterCourse) params.set("course", filterCourse);
    api.get(`/subjects/?${params.toString()}`).then(setSubjects);
    setFilterSubject("");
  }, [filterCourse]);

  // Unit (Chapter model) options narrow to the selected subject.
  useEffect(() => {
    setFilterUnit("");
    if (!filterSubject) {
      setFilterUnits([]);
      return;
    }
    api.get(`/chapters/?subject=${filterSubject}`).then(setFilterUnits);
  }, [filterSubject]);

  // Chapter (Topic model) options narrow to the selected unit.
  useEffect(() => {
    setFilterChapter("");
    setFilterChapters(filterUnits.find((u) => u.id === Number(filterUnit))?.topics || []);
  }, [filterUnit, filterUnits]);

  function clearFilters() {
    setFilterCourse("");
    setFilterSubject("");
    setFilterUnit("");
    setFilterChapter("");
    setFilterTeacher("");
    setSearch("");
  }

  function loadQuestions() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCourse) params.set("course", filterCourse);
    if (filterSubject) params.set("subject", filterSubject);
    if (filterUnit) params.set("chapter", filterUnit);
    if (filterChapter) params.set("topic", filterChapter);
    if (filterTeacher) params.set("teacher", filterTeacher);
    if (search) params.set("search", search);
    api
      .get(`/questions/?${params.toString()}`)
      .then((data) => {
        setQuestions(data);
        setSelectedIds(new Set());
      })
      .finally(() => setLoading(false));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === questions.length ? new Set() : new Set(questions.map((q) => q.id))));
  }

  function applyBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === "delete") {
      setDeleteTarget({ type: "bulk", ids: Array.from(selectedIds) });
    }
  }

  async function runBulkDelete(ids) {
    setBulkRunning(true);
    try {
      // Each /questions/{id}/ DELETE is independently guarded (in-use/attempt
      // checks) and audit-logged server-side — a question blocked by one of
      // those guards fails on its own without stopping the rest of the batch.
      const results = await Promise.allSettled(ids.map((id) => api.del(`/questions/${id}/`)));
      const failed = results.filter((r) => r.status === "rejected");
      loadQuestions();
      setSelectedIds(new Set());
      setBulkAction("");
      if (failed.length > 0) {
        throw new Error(`${ids.length - failed.length} of ${ids.length} deleted. ${failed.length} were blocked (e.g. in-use questions) — see the list for details.`);
      }
    } finally {
      setBulkRunning(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadQuestions, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourse, filterSubject, filterUnit, filterChapter, filterTeacher, search]);

  async function openEdit(row) {
    setError("");
    const q = await api.get(`/questions/${row.id}/`);
    setEditingId(q.id);
    setEditCourses((q.courses || []).map(String));
    setEditSubject(String(q.subject || ""));
    setQuestion({
      marks: q.marks,
      negative_marks: q.negative_marks,
      text: q.text || "",
      latex: q.latex || "",
      image: q.image || null,
      options: (q.options || []).map((o) => ({ text: o.text, latex: o.latex || "", image: o.image || null, is_correct: o.is_correct })),
      explanation: q.explanation || "",
      explanation_latex: q.explanation_latex || "",
      explanation_image: q.explanation_image || null,
      explanation_video_url: q.explanation_video_url || "",
      references: q.references || [],
      remarks: q.remarks || "",
      past_exam_years: q.past_exam_years || "",
      instructor_difficulty: q.instructor_difficulty || "",
      actual_difficulty: q.actual_difficulty || "",
      actual_difficulty_sample_size: q.actual_difficulty_sample_size || 0,
      question_type: q.question_type || "",
      tags: q.tags || [],
    });

    const slug = subjects.find((s) => s.id === q.subject)?.slug;
    const units = slug ? await api.get(`/chapters/?subject=${slug}`) : [];
    setEditUnits(units);
    setEditUnit(String(q.chapter || ""));
    const chapters = units.find((u) => u.id === q.chapter)?.topics || [];
    setEditChapters(chapters);
    setEditChapter(String(q.topic || ""));

    setShowForm(true);
  }

  async function handleEditSubjectChange(value) {
    setEditSubject(value);
    setEditUnit("");
    setEditChapter("");
    setEditChapters([]);
    const slug = subjects.find((s) => s.id === Number(value))?.slug;
    setEditUnits(slug ? await api.get(`/chapters/?subject=${slug}`) : []);
  }

  function handleEditUnitChange(value) {
    setEditUnit(value);
    setEditChapter("");
    setEditChapters(editUnits.find((u) => u.id === Number(value))?.topics || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!editSubject) {
      setError("Select a subject.");
      return;
    }
    if (!question.options.some((o) => o.is_correct)) {
      setError("Mark one option as the correct answer.");
      return;
    }
    if (question.options.some((o) => !o.text.trim())) {
      setError("All options need text.");
      return;
    }
    setSaving(true);
    const payload = {
      subject: Number(editSubject),
      chapter: editUnit ? Number(editUnit) : null,
      topic: editChapter ? Number(editChapter) : null,
      courses: editCourses.map(Number),
      text: question.text,
      latex: question.latex,
      marks: question.marks,
      negative_marks: question.negative_marks,
      remarks: question.remarks,
      past_exam_years: question.past_exam_years,
      instructor_difficulty: question.instructor_difficulty || "",
      question_type: question.question_type || "",
      tags: question.tags || [],
      explanation: question.explanation,
      explanation_latex: question.explanation_latex,
      explanation_video_url: question.explanation_video_url,
      references: question.references || [],
      options: question.options.map((o, i) => ({ text: o.text, latex: o.latex, is_correct: o.is_correct, order: i })),
    };
    try {
      await api.patch(`/questions/${editingId}/`, payload);
      const imageChanged = (v) => v instanceof File || v === IMAGE_REMOVED;
      const hasNewImages =
        imageChanged(question.image) ||
        imageChanged(question.explanation_image) ||
        question.options.some((o) => imageChanged(o.image));
      if (hasNewImages) {
        await uploadQuestionImages(api, editingId, question);
      }
      setShowForm(false);
      loadQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function deleteQuestion(id) {
    setDeleteTarget({ type: "single", id });
  }

  async function runSingleDelete(id) {
    await api.del(`/questions/${id}/`);
    loadQuestions();
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Question Entry</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Add questions in bulk from Excel, or enter them manually.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/questions/new" className="hm-btn-outline">
            ✎ Manual Entry
          </Link>
          <Link href="/questions/import" className="hm-btn-primary">
            📄 Import from Excel
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="hm-input w-40">
          <option value="">Bulk actions</option>
          <option value="delete">Delete</option>
        </select>
        <button
          onClick={applyBulkAction}
          disabled={!bulkAction || selectedIds.size === 0 || bulkRunning}
          className="hm-btn-outline disabled:cursor-not-allowed disabled:opacity-40"
        >
          {bulkRunning ? "Applying…" : "Apply"}
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">{selectedIds.size > 0 ? `${selectedIds.size} selected` : ""}</span>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, subject, unit, chapter, or text…"
          className="hm-input ml-auto w-72"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="hm-input w-44">
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="hm-input w-48">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
          className="hm-input w-44"
          disabled={!filterUnits.length}
        >
          <option value="">All units</option>
          {filterUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
          className="hm-input w-44"
          disabled={!filterChapters.length}
        >
          <option value="">All chapters</option>
          {filterChapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {teachers.length > 0 && (
          <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="hm-input w-44">
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        {(filterCourse || filterSubject || filterUnit || filterChapter || filterTeacher || search) && (
          <button onClick={clearFilters} className="text-xs font-semibold text-brand-blue">
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={questions.length > 0 && selectedIds.size === questions.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Subject / Unit</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {questions.map((q) => (
              <tr key={q.id} className={selectedIds.has(q.id) ? "bg-blue-50" : ""}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelect(q.id)} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">{q.public_id}</td>
                <td className="max-w-md truncate px-4 py-3 text-[var(--color-text)]">{stripHtml(q.text)}</td>
                <td className="px-4 py-3 text-xs">
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-brand-blue">{q.subject_name}</span>
                  {q.chapter_name && <span className="ml-1 text-[var(--color-text-muted)]">{q.chapter_name}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{q.created_by_name || "—"}</td>
                <td className="px-4 py-3">{q.marks}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(q)} className="mr-3 text-xs font-semibold text-brand-blue">
                    Edit
                  </button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs font-semibold text-brand-red">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && questions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No questions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          <span>{questions.length} total</span>
        </div>
      </div>

      {showForm && (
        <Modal title="Edit question" onClose={() => setShowForm(false)} wide fullscreen>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Course(s)</label>
                <select
                  multiple
                  value={editCourses}
                  onChange={(e) => setEditCourses(Array.from(e.target.selectedOptions, (o) => o.value))}
                  className="hm-input h-20"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Subject</label>
                  <select required value={editSubject} onChange={(e) => handleEditSubjectChange(e.target.value)} className="hm-input">
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => handleEditUnitChange(e.target.value)}
                    className="hm-input"
                    disabled={!editUnits.length}
                  >
                    <option value="">None</option>
                    {editUnits.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Chapter</label>
                  <select value={editChapter} onChange={(e) => setEditChapter(e.target.value)} className="hm-input" disabled={!editChapters.length}>
                    <option value="">None</option>
                    {editChapters.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <QuestionCard index={0} question={question} onChange={setQuestion} canRemove={false} />

            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemLabel={deleteTarget.type === "bulk" ? `${deleteTarget.ids.length} selected question(s)` : "this question"}
          requireTyped={deleteTarget.type === "bulk" && deleteTarget.ids.length > 1}
          consequences={[
            "Removes its options, explanation, and uploaded images.",
            "Blocked automatically if it has practice-attempt history or is used in an exam students have already taken.",
          ]}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget.type === "bulk") await runBulkDelete(deleteTarget.ids);
            else await runSingleDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <RequireStaff feature="question_entry">
      <Shell>
        <QuestionsContent />
      </Shell>
    </RequireStaff>
  );
}
