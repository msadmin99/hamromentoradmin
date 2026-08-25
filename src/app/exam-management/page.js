"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BatchPicker from "@/components/BatchPicker";
import CoursePicker from "@/components/CoursePicker";
import ExamBuilderModal from "@/components/ExamBuilderModal";
import QuestionPicker from "@/components/QuestionPicker";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import StudentPicker from "@/components/StudentPicker";
import { api } from "@/lib/api";

const SESSION_STATUS_META = {
  draft: { label: "Draft", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-brand-blue" },
  registration_open: { label: "Registration Open", className: "bg-blue-50 text-brand-blue" },
  live: { label: "Live", className: "bg-brand-green-light text-brand-green" },
  completed: { label: "Completed", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  cancelled: { label: "Cancelled", className: "bg-brand-red-light text-brand-red" },
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Merges standalone (never-rescheduled) Tests with templated exams (one row
 * per ExamTemplate, using its latest session/version) into a single list —
 * matches the spec's "one row per exam" Admin list, while Reschedule/Sessions
 * live underneath via the exam detail page's Schedule History. */
function buildRows(tests, templates) {
  const standalone = tests.filter((t) => !t.exam_template_id);
  const templateRows = templates.map((tpl) => {
    const latest = tpl.latest_session;
    return {
      key: `template-${tpl.id}`,
      linkId: latest?.exam_version ?? null,
      title: tpl.title,
      exam_code: tpl.exam_code,
      exam_type: tpl.exam_type,
      question_count: latest?.question_count ?? 0,
      duration_minutes: latest?.duration_minutes ?? 0,
      total_marks: latest?.total_marks ?? 0,
      created_at: tpl.created_at,
      latest_session: latest,
      participant_count: tpl.total_participants,
      hasHistory: true,
    };
  });
  const standaloneRows = standalone.map((t) => ({
    key: `test-${t.id}`,
    linkId: t.id,
    title: t.title,
    exam_code: null,
    exam_type: t.exam_type,
    question_count: t.question_count,
    duration_minutes: t.duration_minutes,
    total_marks: t.total_marks,
    created_at: t.created_at,
    latest_session: null,
    participant_count: t.attempts_used,
    hasHistory: false,
    raw: t,
  }));
  return [...templateRows, ...standaloneRows];
}

const EXAM_TYPES = [
  { key: "qbank", label: "Question Bank" },
  { key: "daily", label: "Daily Test" },
  { key: "mock", label: "Mock Test" },
  { key: "grand", label: "Grand Test" },
  { key: "pyq", label: "Past Year Questions" },
];
const EXAM_TYPE_LABELS = Object.fromEntries(EXAM_TYPES.map((t) => [t.key, t.label]));

const TABS = [{ key: "all", label: "All Exams" }, ...EXAM_TYPES.map((t) => ({ key: t.key, label: t.label }))];

const DIFFICULTIES = ["", "easy", "medium", "hard"];

function emptyForm(examType) {
  return {
    title: "",
    description: "",
    difficulty: "",
    exam_type: examType || "mock",
    subject: "",
    courses: [],
    assigned_students: [],
    assigned_batches: [],
    is_draft: true,
    academic_year: "2025-26",
    university: "",
    scheduled_start: "",
    scheduled_end: "",
    duration_minutes: 60,
    questions_per_page: 1,
    negative_marking: true,
    shuffle_questions: true,
    shuffle_options: true,
    solutions_visibility: "auto",
    max_attempts: 1,
    is_pro: false,
    is_new: false,
    price: "",
    access_password: "",
    free_preview_questions: 0,
    questions: [],
  };
}

function ExamManagementContent() {
  const [tests, setTests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showBuilder, setShowBuilder] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get("/subjects/").then(setSubjects);
    api.get("/courses/").then(setCourses);
  }, []);

  function loadTests() {
    setLoading(true);
    Promise.all([api.get("/tests/"), api.get("/exam-templates/")])
      .then(([testsData, templatesData]) => {
        setTests(testsData);
        setTemplates(templatesData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadTests, []);

  const rows = useMemo(() => buildRows(tests, templates), [tests, templates]);
  const visibleRows = useMemo(() => (tab === "all" ? rows : rows.filter((r) => r.exam_type === tab)), [rows, tab]);

  async function duplicateExam(testId) {
    setBusyId(testId);
    try {
      await api.post(`/tests/${testId}/duplicate/`, {});
      loadTests();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleArchive(testId, archive) {
    if (archive && !confirm("Archive this exam? Students will no longer see it, but all history is preserved.")) return;
    setBusyId(testId);
    try {
      await api.patch(`/tests/${testId}/`, { is_draft: archive });
      loadTests();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab === "all" ? "mock" : tab));
    setError("");
    setShowBuilder(true);
  }

  async function openEdit(t) {
    const full = await api.get(`/tests/${t.id}/`);
    setEditingId(t.id);
    setForm({
      title: full.title,
      description: full.description || "",
      difficulty: full.difficulty || "",
      exam_type: full.exam_type,
      subject: full.subject || "",
      courses: full.courses || [],
      assigned_students: full.assigned_students || [],
      assigned_batches: full.assigned_batches || [],
      is_draft: full.is_draft,
      academic_year: full.academic_year || "",
      university: full.university || "",
      scheduled_start: full.scheduled_start ? full.scheduled_start.slice(0, 16) : "",
      scheduled_end: full.scheduled_end ? full.scheduled_end.slice(0, 16) : "",
      duration_minutes: full.duration_minutes,
      questions_per_page: full.questions_per_page || 1,
      negative_marking: full.negative_marking,
      shuffle_questions: full.shuffle_questions,
      shuffle_options: full.shuffle_options,
      solutions_visibility: full.solutions_visibility,
      max_attempts: full.max_attempts,
      is_pro: full.is_pro,
      is_new: full.is_new,
      price: full.price || "",
      access_password: full.access_password || "",
      free_preview_questions: full.free_preview_questions || 0,
      questions: full.questions || [],
    });
    setError("");
    setShowBuilder(true);
  }

  async function save(closeAfter) {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.exam_type === "pyq" && (!form.academic_year.trim() || !form.university.trim())) {
      setError('University and Academic year are both required for "Past Year Questions" — students browse these exams by university, then year.');
      return;
    }
    if (!form.is_draft && form.courses.length === 0 && form.assigned_students.length === 0 && form.assigned_batches.length === 0) {
      setError('A published exam needs at least one course, batch, or individual student assigned — otherwise no student can see it. Assign it in the "Access & Assignment" tab, or keep it as Draft.');
      return;
    }
    setError("");
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      difficulty: form.difficulty,
      exam_type: form.exam_type,
      subject: form.subject || null,
      courses: form.courses,
      assigned_students: form.assigned_students,
      assigned_batches: form.assigned_batches,
      is_draft: form.is_draft,
      academic_year: form.academic_year,
      university: form.university,
      scheduled_start: form.scheduled_start || null,
      scheduled_end: form.scheduled_end || null,
      duration_minutes: Number(form.duration_minutes),
      questions_per_page: Number(form.questions_per_page) || 1,
      negative_marking: form.negative_marking,
      shuffle_questions: form.shuffle_questions,
      shuffle_options: form.shuffle_options,
      solutions_visibility: form.solutions_visibility,
      max_attempts: Number(form.max_attempts),
      is_pro: form.is_pro,
      is_new: form.is_new,
      price: form.price || null,
      access_password: form.access_password,
      free_preview_questions: Number(form.free_preview_questions) || 0,
      question_ids: form.questions.map((q) => q.id),
    };
    try {
      if (editingId) {
        await api.patch(`/tests/${editingId}/`, payload);
      } else {
        const created = await api.post("/tests/", payload);
        setEditingId(created.id);
      }
      loadTests();
      if (closeAfter) setShowBuilder(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }


  const tabs = [
    {
      key: "general",
      label: "General",
      content: (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="hm-input"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Description (optional — shown on the exam card)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="hm-input"
              placeholder="e.g. Sharpen your skills with exam-focused practice."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Exam Type</label>
              <select
                value={form.exam_type}
                onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
                className="hm-input"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Subject (optional)</label>
              <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="hm-input">
                <option value="">None</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Difficulty (optional)</label>
              <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className="hm-input">
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d || "Not set"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.exam_type === "pyq" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                University <span className="text-brand-red">* required for Past Year Questions</span>
              </label>
              <input
                value={form.university}
                onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                placeholder="e.g. IOM, MOE, BPKIHS, KU"
                className={`hm-input ${!form.university.trim() ? "border-brand-red" : ""}`}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Academic year{form.exam_type === "pyq" && <span className="text-brand-red"> *</span>}
              </label>
              <input
                value={form.academic_year}
                onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
                className={`hm-input ${form.exam_type === "pyq" && !form.academic_year.trim() ? "border-brand-red" : ""}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Scheduled start (optional)</label>
              <input
                type="datetime-local"
                value={form.scheduled_start}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_start: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Scheduled end (optional)</label>
              <input
                type="datetime-local"
                value={form.scheduled_end}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_end: e.target.value }))}
                className="hm-input"
              />
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-[var(--color-border)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--color-text)]">Questions ({form.questions.length})</p>
              <button type="button" onClick={() => setShowPicker(true)} className="hm-btn-outline text-xs">
                + Insert questions
              </button>
            </div>
            {form.questions.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)]">
                {form.questions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2 text-xs last:border-0"
                  >
                    <span className="truncate">{q.text}</span>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, questions: f.questions.filter((x) => x.id !== q.id) }))}
                      className="flex-none font-semibold text-brand-red"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs italic text-[var(--color-text-muted)]">There are no questions yet.</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "access",
      label: "Access & Assignment",
      content: (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3">
            <p className="text-sm font-bold text-[var(--color-text)]">Exam status</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Draft: only staff can see this exam. Published: visible to whoever is assigned below —
              never automatically to everyone.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_draft: true }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${form.is_draft ? "bg-brand-blue text-white" : "border border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_draft: false }))}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${!form.is_draft ? "bg-brand-green text-white" : "border border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
              >
                Published
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Assign to course(s)
            </label>
            <CoursePicker courses={courses} selected={form.courses} onChange={(v) => setForm((f) => ({ ...f, courses: v }))} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Assign to batch(es) (optional — grants access to a specific cohort within a course)
            </label>
            <BatchPicker
              selectedCourses={courses.filter((c) => form.courses.includes(c.id))}
              selected={form.assigned_batches}
              onChange={(v) => setForm((f) => ({ ...f, assigned_batches: v }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Assign to individual student(s) (optional — overrides course/batch scoping for these students)
            </label>
            <StudentPicker selected={form.assigned_students} onChange={(v) => setForm((f) => ({ ...f, assigned_students: v }))} />
          </div>

          <AccessPreviewPanel courses={form.courses} assignedStudents={form.assigned_students} assignedBatches={form.assigned_batches} />
        </div>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      content: (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Duration (minutes)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="hm-input w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Questions per page</label>
              <input
                type="number"
                min={1}
                value={form.questions_per_page}
                onChange={(e) => setForm((f) => ({ ...f, questions_per_page: e.target.value }))}
                className="hm-input w-40"
              />
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">1 = one question per screen (classic)</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text)]">
            <Checkbox label="Negative marking" checked={form.negative_marking} onChange={(v) => setForm((f) => ({ ...f, negative_marking: v }))} />
            <Checkbox
              label="Shuffle questions"
              checked={form.shuffle_questions}
              onChange={(v) => setForm((f) => ({ ...f, shuffle_questions: v }))}
            />
            <Checkbox label="Shuffle options" checked={form.shuffle_options} onChange={(v) => setForm((f) => ({ ...f, shuffle_options: v }))} />
          </div>
        </div>
      ),
    },
    {
      key: "results",
      label: "Results Settings",
      content: (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Solutions visible to students</label>
          <select
            value={form.solutions_visibility}
            onChange={(e) => setForm((f) => ({ ...f, solutions_visibility: e.target.value }))}
            className="hm-input w-full max-w-sm"
          >
            <option value="auto">Automatically, once the exam window ends</option>
            <option value="manual">Only when I click &quot;Release solutions&quot;</option>
          </select>
        </div>
      ),
    },
    {
      key: "limitation",
      label: "Limitation Users",
      content: (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Max attempts per student</label>
            <input
              type="number"
              min={1}
              value={form.max_attempts}
              onChange={(e) => setForm((f) => ({ ...f, max_attempts: e.target.value }))}
              className="hm-input w-40"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text)]">
            <Checkbox label="Mark as PRO" checked={form.is_pro} onChange={(v) => setForm((f) => ({ ...f, is_pro: v }))} />
            <Checkbox label="Mark as NEW" checked={form.is_new} onChange={(v) => setForm((f) => ({ ...f, is_new: v }))} />
          </div>
          {form.is_pro && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Price</label>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="e.g. 999"
                className="hm-input w-40"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Access password (optional)</label>
            <input
              value={form.access_password}
              onChange={(e) => setForm((f) => ({ ...f, access_password: e.target.value }))}
              className="hm-input"
            />
          </div>
          {form.is_pro && form.exam_type === "daily" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Free preview questions (Daily Test only)
              </label>
              <input
                type="number"
                min={0}
                value={form.free_preview_questions}
                onChange={(e) => setForm((f) => ({ ...f, free_preview_questions: e.target.value }))}
                className="hm-input w-40"
              />
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Students without a Daily Test subscription can view this many questions, but can&apos;t submit.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Exam Management</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            One Exam Engine for every exam type — create an exam, pick its type, and map it to courses.
          </p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Create Exam
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold ${
              tab === t.key ? "border-b-2 border-brand-blue text-brand-blue" : "text-[var(--color-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 hm-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Exam Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Total Marks</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Latest Session</th>
              <th className="px-4 py-3">Session Status</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {visibleRows.map((r) => {
              const statusMeta = r.latest_session ? SESSION_STATUS_META[r.latest_session.status] : null;
              const conducted = r.hasHistory || (r.raw?.scheduled_start && new Date(r.raw.scheduled_start) < new Date());
              return (
                <tr key={r.key}>
                  <td className="px-4 py-3">
                    <Link href={`/exam-management/${r.linkId}`} className="font-medium text-[var(--color-text)] hover:text-brand-blue">
                      {r.title}
                    </Link>
                    {r.exam_code && <p className="text-[11px] text-[var(--color-text-muted)]">{r.exam_code}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{EXAM_TYPE_LABELS[r.exam_type] || r.exam_type}</td>
                  <td className="px-4 py-3">{r.question_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.duration_minutes} min</td>
                  <td className="px-4 py-3">{r.total_marks}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.latest_session ? (
                      <>
                        <p className="text-[var(--color-text)]">{r.latest_session.session_name}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">{formatDateTime(r.latest_session.start_datetime)}</p>
                      </>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {statusMeta ? (
                      <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{r.participant_count}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/exam-management/${r.linkId}`} className="mr-3 text-xs font-semibold text-brand-blue">
                      View
                    </Link>
                    <Link
                      href={`/exam-management/${r.linkId}/reschedule`}
                      className={`mr-3 text-xs font-semibold ${conducted ? "text-brand-green" : "text-brand-blue"}`}
                    >
                      {conducted ? "🔄 Reschedule" : "Schedule"}
                    </Link>
                    {!r.hasHistory && r.raw && (
                      <button onClick={() => openEdit(r.raw)} className="mr-3 text-xs font-semibold text-brand-blue">
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => duplicateExam(r.linkId)}
                      disabled={busyId === r.linkId}
                      className="mr-3 text-xs font-semibold text-[var(--color-text-muted)] disabled:opacity-60"
                    >
                      Duplicate
                    </button>
                    {!r.hasHistory && r.raw && (
                      <button
                        onClick={() => toggleArchive(r.linkId, !r.raw.is_draft)}
                        disabled={busyId === r.linkId}
                        className="text-xs font-semibold text-brand-red disabled:opacity-60"
                      >
                        {r.raw.is_draft ? "Unarchive" : "Archive"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No exams here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showBuilder && (
        <ExamBuilderModal
          title={editingId ? "Edit exam" : "Create exam"}
          tabs={tabs}
          onCancel={() => setShowBuilder(false)}
          onSave={save}
          saving={saving}
          error={error}
        />
      )}

      {showPicker && (
        <QuestionPicker
          subjects={subjects}
          initialQuestions={form.questions}
          onCancel={() => setShowPicker(false)}
          onInsert={(qs) => {
            setForm((f) => ({ ...f, questions: qs }));
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

/** "Who can see this exam?" confirmation box (spec item 16) — computed from
 * the not-yet-saved selection currently in the form, so an admin can review
 * before ever hitting Save/Publish. */
function AccessPreviewPanel({ courses, assignedStudents, assignedBatches }) {
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const data = await api.post("/tests/access_preview/", {
        courses, assigned_students: assignedStudents, assigned_batches: assignedBatches,
      });
      setPreview(data);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-text)]">Exam Access Preview</p>
        <button type="button" onClick={check} disabled={checking} className="text-xs font-semibold text-brand-blue disabled:opacity-60">
          {checking ? "Checking…" : "Check who can see this →"}
        </button>
      </div>
      {preview && (
        <div className="mt-2 text-xs text-[var(--color-text)]">
          <p>
            Students who can access: <strong>{preview.eligible_count}</strong>
          </p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Via course(s): {preview.courses.length > 0 ? preview.courses.map((c) => c.name).join(", ") : "none"}
            {preview.batch_count > 0 && ` · ${preview.batch_count} batch(es)`}
            {preview.individual_student_count > 0 && ` · ${preview.individual_student_count} individual student(s)`}
          </p>
          <p className="mt-1 text-[var(--color-text-muted)]">All other students: NOT VISIBLE.</p>
        </div>
      )}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function ExamManagementPage() {
  return (
    <RequireStaff feature="test_series">
      <Shell>
        <ExamManagementContent />
      </Shell>
    </RequireStaff>
  );
}
