"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BatchPicker from "@/components/BatchPicker";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import CoursePicker from "@/components/CoursePicker";
import ExamBuilderModal from "@/components/ExamBuilderModal";
import QuestionPicker from "@/components/QuestionPicker";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import StudentPicker from "@/components/StudentPicker";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import CreateExamWizardShell from "@/components/examManagement/CreateExamWizardShell";
import ExamTable from "@/components/examManagement/ExamTable";
import FilterBar from "@/components/examManagement/FilterBar";
import ProgramBar from "@/components/examManagement/ProgramBar";
import QuickActionsPanel from "@/components/examManagement/QuickActionsPanel";
import SavedViewsPanel from "@/components/examManagement/SavedViewsPanel";
import SchedulePickerModal from "@/components/examManagement/SchedulePickerModal";
import StatsCard from "@/components/examManagement/StatsCard";
import { EXAM_TYPES, TABS, hierarchyLabelsFor } from "@/components/examManagement/constants";
import { ToastStack, useToasts } from "@/components/examManagement/toast";

const DIFFICULTIES = ["", "easy", "medium", "hard"];
const PAGE_SIZE = 20;

function emptyForm(examType) {
  return {
    title: "",
    description: "",
    difficulty: "",
    exam_type: examType || "mock",
    program: "", // UI-only (drives Course choices + hierarchy labels) — not sent to the API; a Test has no program field, only courses.
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

function normalizeTemplateRow(t) {
  const latest = t.latest_session;
  return {
    key: `template-${t.id}`,
    linkId: latest?.exam_version ?? null,
    title: t.title,
    exam_code: t.exam_code,
    exam_type: t.exam_type,
    question_count: latest?.question_count ?? 0,
    duration_minutes: latest?.duration_minutes ?? 0,
    participant_count: t.total_participants,
    status: t.status,
    courses_detail: t.courses_detail,
    hasHistory: true,
  };
}

function normalizeStandaloneRow(t) {
  return {
    key: `test-${t.id}`,
    linkId: t.id,
    title: t.title,
    exam_code: null,
    exam_type: t.exam_type,
    question_count: t.question_count,
    duration_minutes: t.duration_minutes,
    participant_count: t.attempts_used,
    status: t.is_draft ? "draft" : "published",
    courses_detail: t.courses_detail,
    hasHistory: false,
    raw: t,
  };
}

function readInitialFilters() {
  if (typeof window === "undefined") return {};
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function ExamManagementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { toasts, push: pushToast } = useToasts();
  const initial = useMemo(readInitialFilters, []);

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [savedViews, setSavedViews] = useState([]);

  const [program, setProgram] = useState(initial.program || "");
  const [dataSource, setDataSource] = useState(initial.source === "templates" ? "templates" : "standalone");
  const [tab, setTab] = useState(initial.tab || "all");
  const [filters, setFilters] = useState({
    search: initial.search || "",
    subject: initial.subject || "",
    status: initial.status || "",
    access: initial.access || "",
  });
  const [page, setPage] = useState(Number(initial.page) || 1);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsByProgram, setStatsByProgram] = useState({});

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    api.get("/subjects/").then(setSubjects);
    api.get("/courses/").then(setCourses);
    refreshSavedViews();
  }, []);

  const programs = useMemo(
    () => [...new Set(courses.map((c) => c.program_group).filter(Boolean))].sort(),
    [courses],
  );

  // Keep the URL in sync (replace, not push) so filters survive refresh/back —
  // plain window.location read on mount + router.replace on change, matching
  // this codebase's existing avoid-useSearchParams-Suspense-boundary pattern
  // (see Admin/src/app/questions/page.js).
  useEffect(() => {
    const params = new URLSearchParams();
    if (program) params.set("program", program);
    if (dataSource !== "standalone") params.set("source", dataSource);
    if (tab !== "all") params.set("tab", tab);
    if (filters.search) params.set("search", filters.search);
    if (filters.subject) params.set("subject", filters.subject);
    if (filters.status) params.set("status", filters.status);
    if (filters.access) params.set("access", filters.access);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, dataSource, tab, filters, page]);

  // Any filter/scope change resets pagination back to page 1.
  useEffect(() => {
    setPage(1);
  }, [program, dataSource, tab, filters.search, filters.subject, filters.status, filters.access]);

  const loadRows = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    if (program) params.set("program", program);
    if (filters.search) params.set("search", filters.search);
    if (filters.subject) params.set("subject", filters.subject);
    if (filters.status) params.set("status", filters.status);
    if (filters.access) params.set("access", filters.access);
    if (tab !== "all") params.set("exam_type", tab);
    if (dataSource === "standalone") params.set("standalone", "true");

    const path = `${dataSource === "templates" ? "/exam-templates/browse/" : "/tests/browse/"}?${params.toString()}`;
    api
      .get(path)
      .then((data) => {
        const results = data.results || [];
        setRows(results.map(dataSource === "templates" ? normalizeTemplateRow : normalizeStandaloneRow));
        setCount(data.count || 0);
      })
      .catch((err) => pushToast(err.message || "Could not load exams.", "error"))
      .finally(() => setLoading(false));
  }, [dataSource, program, filters, tab, page, pushToast]);

  useEffect(loadRows, [loadRows]);

  const loadStats = useCallback(() => {
    api
      .get(`/tests/stats/${program ? `?program=${encodeURIComponent(program)}` : ""}`)
      .then(setStats)
      .catch(() => {});
  }, [program]);
  useEffect(loadStats, [loadStats]);

  useEffect(() => {
    api
      .get("/tests/stats_by_program/")
      .then((data) => setStatsByProgram(Object.fromEntries(data.map((r) => [r.program, r]))))
      .catch(() => {});
  }, []);

  function refreshSavedViews() {
    api.get("/saved-exam-views/").then(setSavedViews).catch(() => {});
  }

  function applySavedView(f) {
    setProgram(f.program || "");
    setDataSource(f.dataSource || "standalone");
    setTab(f.tab || "all");
    setFilters({ search: f.search || "", subject: f.subject || "", status: f.status || "", access: f.access || "" });
  }

  function resetFilters() {
    setFilters({ search: "", subject: "", status: "", access: "" });
  }

  async function duplicateExam(row) {
    setBusyKey(row.key);
    try {
      await api.post(`/tests/${row.linkId}/duplicate/`, {});
      pushToast("Exam duplicated as a new draft.");
      loadRows();
      loadStats();
    } catch (err) {
      pushToast(err.message || "Could not duplicate this exam.", "error");
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleArchive(row) {
    const nextDraft = row.status !== "draft";
    setBusyKey(row.key);
    try {
      await api.patch(`/tests/${row.linkId}/`, { is_draft: nextDraft });
      pushToast(nextDraft ? "Exam archived — students can no longer see it." : "Exam published.");
      loadRows();
      loadStats();
    } catch (err) {
      pushToast(err.message || "Could not update this exam.", "error");
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmDeleteExam() {
    await api.del(`/tests/${deleteTarget.linkId}/`);
    pushToast("Exam deleted.");
    setDeleteTarget(null);
    loadRows();
    loadStats();
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab === "all" ? "mock" : tab));
    setError("");
    setWizardStep(0);
    setShowWizard(true);
  }

  async function openEdit(t) {
    const full = await api.get(`/tests/${t.id}/`);
    setEditingId(t.id);
    setForm({
      title: full.title,
      description: full.description || "",
      difficulty: full.difficulty || "",
      exam_type: full.exam_type,
      program: full.courses?.length ? courses.find((c) => c.id === full.courses[0])?.program_group || "" : "",
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
    if (showWizard && !form.program) {
      setError("Select a Program first — every exam must belong to a program.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.exam_type === "pyq" && (!form.academic_year.trim() || !form.university.trim())) {
      setError('University and Academic year are both required for "Past Year Questions" — students browse these exams by university, then year.');
      return;
    }
    if (!form.is_draft && form.courses.length === 0 && form.assigned_students.length === 0 && form.assigned_batches.length === 0) {
      setError('A published exam needs at least one course, batch, or individual student assigned — otherwise no student can see it. Assign it in the "Access & Assignment" step, or keep it as Draft.');
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
        pushToast("Exam updated.");
      } else {
        const created = await api.post("/tests/", payload);
        setEditingId(created.id);
        pushToast("Exam created.");
      }
      loadRows();
      loadStats();
      if (closeAfter) {
        setShowBuilder(false);
        setShowWizard(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hierarchyLabels = hierarchyLabelsFor(form.program);
  const programCourses = useMemo(
    () => (form.program ? courses.filter((c) => c.program_group === form.program) : courses),
    [courses, form.program],
  );

  const typeBasicsContent = (
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
          <select value={form.exam_type} onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))} className="hm-input">
            {EXAM_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
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
      <div className="grid grid-cols-2 gap-3">
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
    </div>
  );

  const academicMappingContent = (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
          {hierarchyLabels.subject} (optional)
        </label>
        <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="hm-input">
          <option value="">None</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--color-text)]">Questions ({form.questions.length})</p>
          <button type="button" onClick={() => setShowPicker(true)} className="hm-btn-outline text-xs">
            + Insert questions
          </button>
        </div>
        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
          Pick questions by {hierarchyLabels.subject.toLowerCase()} → {hierarchyLabels.unit.toLowerCase()} → {hierarchyLabels.topic.toLowerCase()}.
        </p>
        {form.questions.length > 0 ? (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)]">
            {form.questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2 text-xs last:border-0">
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
  );

  const accessContent = (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3">
        <p className="text-sm font-bold text-[var(--color-text)]">Exam status</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Draft: only staff can see this exam. Published: visible to whoever is assigned below — never automatically to everyone.
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
        <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Assign to course(s)</label>
        <CoursePicker courses={programCourses} selected={form.courses} onChange={(v) => setForm((f) => ({ ...f, courses: v }))} />
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
  );

  const settingsContent = (
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
        <Checkbox label="Shuffle questions" checked={form.shuffle_questions} onChange={(v) => setForm((f) => ({ ...f, shuffle_questions: v }))} />
        <Checkbox label="Shuffle options" checked={form.shuffle_options} onChange={(v) => setForm((f) => ({ ...f, shuffle_options: v }))} />
      </div>
    </div>
  );

  const resultsContent = (
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
  );

  const limitationContent = (
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
        <input value={form.access_password} onChange={(e) => setForm((f) => ({ ...f, access_password: e.target.value }))} className="hm-input" />
      </div>
      {form.is_pro && form.exam_type === "daily" && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Free preview questions (Daily Test only)</label>
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
  );

  const programContent = (
    <div>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Every exam belongs to a program — this determines which courses, and which academic-mapping labels, you&apos;ll
        see in the next steps.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {programs.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setForm((f) => ({ ...f, program: p }))}
            className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
              form.program === p ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-[var(--color-border)] text-[var(--color-text)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {programs.length === 0 && (
        <p className="text-xs italic text-[var(--color-text-muted)]">
          No programs yet — add a Course with a Program Group under Courses first.
        </p>
      )}
    </div>
  );

  const editTabs = [
    {
      key: "general",
      label: "General",
      content: (
        <div className="flex flex-col gap-4">
          {typeBasicsContent}
          {academicMappingContent}
        </div>
      ),
    },
    { key: "access", label: "Access & Assignment", content: accessContent },
    { key: "settings", label: "Settings", content: settingsContent },
    { key: "results", label: "Results Settings", content: resultsContent },
    { key: "limitation", label: "Limitation Users", content: limitationContent },
  ];

  const createSteps = [
    { key: "program", label: "Program", content: programContent },
    { key: "type", label: "Exam Type", content: typeBasicsContent },
    { key: "mapping", label: "Academic Mapping", content: academicMappingContent },
    { key: "access", label: "Access & Assignment", content: accessContent },
    { key: "settings", label: "Settings", content: settingsContent },
    { key: "results", label: "Results Settings", content: resultsContent },
    { key: "limitation", label: "Limitation Users", content: limitationContent },
  ];

  function canAdvance(stepIndex) {
    const key = createSteps[stepIndex]?.key;
    if (key === "program") return !!form.program;
    if (key === "type") {
      if (!form.title.trim()) return false;
      if (form.exam_type === "pyq" && (!form.academic_year.trim() || !form.university.trim())) return false;
      return true;
    }
    return true;
  }

  const emptyReason =
    filters.search || filters.subject || filters.status || filters.access || program
      ? "No exams match your current filters — try Reset, or broaden your search."
      : dataSource === "standalone"
        ? 'No exams here yet. Click "+ Create Exam" to build your first one.'
        : "No exam has been scheduled yet — create an exam, then use Schedule to give it its first session.";

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Exam Management</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Organize, create and manage all types of examinations across programs.</p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Create Exam
        </button>
      </div>

      <ProgramBar courses={courses} statsByProgram={statsByProgram} selectedProgram={program} onSelect={setProgram} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)]">
        <div className="flex flex-wrap gap-1">
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
        <div className="mb-1 flex rounded-lg border border-[var(--color-border)] p-0.5" role="tablist" aria-label="Exam collection">
          <button
            role="tab"
            aria-selected={dataSource === "standalone"}
            onClick={() => setDataSource("standalone")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${dataSource === "standalone" ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"}`}
          >
            Exams
          </button>
          <button
            role="tab"
            aria-selected={dataSource === "templates"}
            onClick={() => setDataSource("templates")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${dataSource === "templates" ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"}`}
          >
            Scheduled Exam Series
          </button>
        </div>
      </div>

      <FilterBar
        programs={programs}
        subjects={subjects}
        filters={{ program, examType: tab === "all" ? "" : tab, ...filters }}
        onChange={(p) => {
          if (p.program !== undefined) setProgram(p.program);
          else if (p.examType !== undefined) setTab(p.examType || "all");
          else setFilters((f) => ({ ...f, ...p }));
        }}
        onReset={() => {
          resetFilters();
          setTab("all");
        }}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <ExamTable
          rows={rows}
          loading={loading}
          emptyReason={emptyReason}
          count={count}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          user={user}
          onSchedule={(row) => router.push(`/exam-management/${row.linkId}/reschedule`)}
          onViewSessions={(row) => router.push(`/exam-management/${row.linkId}`)}
          onEdit={openEdit}
          onDuplicate={duplicateExam}
          onArchiveToggle={toggleArchive}
          onDelete={setDeleteTarget}
          busyKey={busyKey}
        />

        <div className="flex flex-col gap-4">
          <QuickActionsPanel user={user} onCreateExam={(examType) => { setEditingId(null); setForm(emptyForm(examType)); setError(""); setWizardStep(0); setShowWizard(true); }} onScheduleClick={() => setShowSchedulePicker(true)} />
          <StatsCard stats={stats} program={program} />
          <SavedViewsPanel
            views={savedViews}
            filters={{ program, dataSource, tab, ...filters }}
            onApply={applySavedView}
            onSaved={refreshSavedViews}
            pushToast={pushToast}
          />
        </div>
      </div>

      {showWizard && (
        <CreateExamWizardShell
          steps={createSteps}
          activeIndex={wizardStep}
          onStepChange={setWizardStep}
          canAdvance={canAdvance}
          onCancel={() => setShowWizard(false)}
          onSave={save}
          saving={saving}
          error={error}
        />
      )}

      {showBuilder && (
        <ExamBuilderModal title="Edit exam" tabs={editTabs} onCancel={() => setShowBuilder(false)} onSave={save} saving={saving} error={error} />
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

      {showSchedulePicker && <SchedulePickerModal onCancel={() => setShowSchedulePicker(false)} />}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemLabel={deleteTarget.title}
          consequences={["Any questions used only in this exam stay in the Question Bank.", "This cannot be undone."]}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteExam}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}

/** "Who can see this exam?" confirmation box (spec item 16) — computed from
 * the not-yet-saved selection currently in the create/edit form, so an
 * admin can review before ever hitting Save/Publish. */
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
