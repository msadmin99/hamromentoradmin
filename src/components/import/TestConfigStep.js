"use client";

import { useEffect, useState } from "react";
import CoursePicker from "@/components/CoursePicker";
import { api } from "@/lib/api";

const EXAM_TYPES = [
  { key: "qbank", label: "Question Bank" },
  { key: "daily", label: "Daily Test" },
  { key: "mock", label: "Mock Test" },
  { key: "grand", label: "Grand Test" },
  { key: "pyq", label: "Past Year Questions" },
];
const DIFFICULTIES = ["", "easy", "medium", "hard"];

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-[var(--color-text)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function defaultConfig(batch) {
  return {
    title: "",
    description: "",
    difficulty: "",
    exam_type: "mock",
    courses: batch.course_ids || [],
    academic_year: "",
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
    is_draft: false,
  };
}

export default function TestConfigStep({ batch, initialConfig, onContinue, onBack }) {
  const [form, setForm] = useState(initialConfig || defaultConfig(batch));
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/courses/").then(setCourses);
  }, []);

  function handleContinue() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setError("");
    onContinue({
      ...form,
      duration_minutes: Number(form.duration_minutes) || 60,
      questions_per_page: Number(form.questions_per_page) || 1,
      max_attempts: Number(form.max_attempts) || 1,
      free_preview_questions: Number(form.free_preview_questions) || 0,
      price: form.price === "" ? null : form.price,
      scheduled_start: form.scheduled_start || null,
      scheduled_end: form.scheduled_end || null,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hm-card p-4">
        <p className="text-sm font-bold text-[var(--color-text)]">Test Configuration</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Connects to Exam Management — the same settings you&apos;d set for any test. Subject/Chapter/Topic already
          came from the previous step and apply to every imported question.
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="hm-input" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Description (optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="hm-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Duration (minutes)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Questions per page</label>
              <input
                type="number"
                min={1}
                value={form.questions_per_page}
                onChange={(e) => setForm((f) => ({ ...f, questions_per_page: e.target.value }))}
                className="hm-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
              Assign to courses (blank = visible to every enrolled student)
            </label>
            <CoursePicker courses={courses} selected={form.courses} onChange={(v) => setForm((f) => ({ ...f, courses: v }))} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Academic year</label>
              <input
                value={form.academic_year}
                onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
                placeholder="e.g. 2025-26"
                className="hm-input"
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

          <div className="flex flex-wrap gap-4">
            <Checkbox label="Negative marking" checked={form.negative_marking} onChange={(v) => setForm((f) => ({ ...f, negative_marking: v }))} />
            <Checkbox
              label="Shuffle questions"
              checked={form.shuffle_questions}
              onChange={(v) => setForm((f) => ({ ...f, shuffle_questions: v }))}
            />
            <Checkbox label="Shuffle options" checked={form.shuffle_options} onChange={(v) => setForm((f) => ({ ...f, shuffle_options: v }))} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Max attempts per student</label>
              <input
                type="number"
                min={1}
                value={form.max_attempts}
                onChange={(e) => setForm((f) => ({ ...f, max_attempts: e.target.value }))}
                className="hm-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Solutions visible to students</label>
              <select
                value={form.solutions_visibility}
                onChange={(e) => setForm((f) => ({ ...f, solutions_visibility: e.target.value }))}
                className="hm-input"
              >
                <option value="auto">Automatically, once the exam window ends</option>
                <option value="manual">Only when I click &quot;Release solutions&quot;</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Checkbox label="Mark as PRO" checked={form.is_pro} onChange={(v) => setForm((f) => ({ ...f, is_pro: v }))} />
            <Checkbox label="Mark as NEW" checked={form.is_new} onChange={(v) => setForm((f) => ({ ...f, is_new: v }))} />
          </div>

          {form.is_pro && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Price</label>
                <input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 999"
                  className="hm-input"
                />
              </div>
              {form.exam_type === "daily" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                    Free preview questions
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.free_preview_questions}
                    onChange={(e) => setForm((f) => ({ ...f, free_preview_questions: e.target.value }))}
                    className="hm-input"
                  />
                </div>
              )}
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

          <div className="rounded-xl border border-[var(--color-border)] p-3">
            <p className="mb-2 text-xs font-bold text-[var(--color-text)]">Status</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!form.is_draft} onChange={() => setForm((f) => ({ ...f, is_draft: false }))} />
                Publish immediately
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={form.is_draft} onChange={() => setForm((f) => ({ ...f, is_draft: true }))} />
                Save as Draft (staff-only until published)
              </label>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-brand-red">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onBack} className="hm-btn-outline">
          Back
        </button>
        <button onClick={handleContinue} className="hm-btn-primary">
          Continue to Distribution Preview →
        </button>
      </div>
    </div>
  );
}
