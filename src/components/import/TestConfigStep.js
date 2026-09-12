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
const DAY_MS = 24 * 60 * 60 * 1000;

// Daily Test schedule audit (timezone fix): `<input type="datetime-local">`
// gives a raw, offset-less string ("2026-09-13T08:00") with no timezone
// information at all. Sending that straight to the backend used to mean
// Django/DRF would interpret it using the server's active timezone
// (UTC — this app never calls timezone.activate(), confirmed), not the
// admin's intended Nepal wall-clock time: "8:00 AM" typed here could be
// stored as 8:00 AM UTC, ~5h45m later than intended. `new Date(value)`
// parses that same string using the ADMIN'S OWN BROWSER timezone, and
// `.toISOString()` converts it to a real, unambiguous UTC instant — the
// exact technique already used correctly, elsewhere in this same Admin
// app, by the Reschedule/Exam Sessions flow
// (exam-management/[id]/reschedule/page.js's `new Date(...).toISOString()`
// call) — this just brings the exam-builder's own scheduling fields onto
// the same, already-proven pattern.
function toUtcIso(localDatetimeValue) {
  if (!localDatetimeValue) return null;
  const d = new Date(localDatetimeValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-[var(--color-text)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// Phase 5: fallback ONLY, used before /tests/exam_type_policies/ has loaded
// (or if that fetch fails) — see the effect below, which merges the
// canonical per-exam_type policy in once it arrives. `is_draft` here is now
// `true`, matching the canonical, deliberately-resolved default (previously
// `false` — this file and exam-management/page.js's emptyForm() had
// drifted to opposite defaults; see
// Backend/docs/PHASE5_AUDIT_AND_ARCHITECTURE.md §3 for why `true` was
// chosen). Both files now read the same backend source of truth instead of
// needing to be kept in sync by hand.
function defaultConfig(batch) {
  return {
    title: "",
    description: "",
    difficulty: "",
    exam_type: "mock",
    courses: batch.course_ids || [],
    academic_year: "",
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
    is_draft: true,
  };
}

export default function TestConfigStep({ batch, initialConfig, onContinue, onBack }) {
  const [form, setForm] = useState(initialConfig || defaultConfig(batch));
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/courses/").then(setCourses);
    if (initialConfig) return; // resuming an already-configured draft — never overwrite it with fresh policy
    api
      .get("/tests/exam_type_policies/")
      .then((data) => {
        const normalized = {};
        for (const [examType, policy] of Object.entries(data || {})) {
          normalized[examType] = { ...policy, price: policy.price == null ? "" : policy.price };
        }
        setForm((f) => ({ ...f, ...(normalized[f.exam_type] || {}) }));
      })
      .catch(() => {}); // fallback defaults in defaultConfig() cover this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.exam_type === "pyq" && !form.academic_year.trim()) {
      // Past Year Question sets are only discoverable via /past-year-questions,
      // which lists them by university then academic_year — without one, a PYQ
      // test is created successfully and shows up in Exam Management, but is
      // permanently invisible to students (no year to click into). Catch it here.
      setError('Academic year is required for "Past Year Questions" — students find these exams by year.');
      return;
    }
    if (form.exam_type === "pyq" && !form.university.trim()) {
      setError('University is required for "Past Year Questions" — students find these exams by university first.');
      return;
    }
    setError("");
    const scheduledStartIso = toUtcIso(form.scheduled_start);
    // Daily Test schedule audit: prefer automatically deriving
    // scheduled_end = scheduled_start + 24h for Daily Test specifically —
    // its own requirement is a hard 24-hour window, not the flexible,
    // admin-chosen-length window Grand/Mock/PYQ use. Deriving it here
    // (rather than trusting two independently-typed inputs to agree)
    // makes an inconsistent Daily Test window structurally impossible
    // for anything created through this screen. Every other exam type's
    // scheduled_end stays fully manual, unchanged.
    const scheduledEndIso =
      form.exam_type === "daily"
        ? scheduledStartIso
          ? new Date(new Date(scheduledStartIso).getTime() + DAY_MS).toISOString()
          : null
        : toUtcIso(form.scheduled_end);
    onContinue({
      ...form,
      duration_minutes: Number(form.duration_minutes) || 60,
      questions_per_page: Number(form.questions_per_page) || 1,
      max_attempts: Number(form.max_attempts) || 1,
      free_preview_questions: Number(form.free_preview_questions) || 0,
      price: form.price === "" ? null : form.price,
      scheduled_start: scheduledStartIso,
      scheduled_end: scheduledEndIso,
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
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                Students browse Past Year Questions by university first, then year — without this, the exam
                won&apos;t appear on the student site.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Academic year{form.exam_type === "pyq" && <span className="text-brand-red"> * required for Past Year Questions</span>}
              </label>
              <input
                value={form.academic_year}
                onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
                placeholder="e.g. 2025-26"
                className={`hm-input ${form.exam_type === "pyq" && !form.academic_year.trim() ? "border-brand-red" : ""}`}
              />
              {form.exam_type === "pyq" && (
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  Students find Past Year Question sets by year — without this, the exam won&apos;t appear on the student site.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                {form.exam_type === "daily" ? "Opens at (optional, Nepal time)" : "Scheduled start (optional)"}
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_start}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_start: e.target.value }))}
                className="hm-input"
              />
            </div>
            {form.exam_type === "daily" ? (
              // Daily Test schedule audit: scheduled_end is auto-derived
              // (scheduled_start + 24h, computed on submit — see
              // toUtcIso/handleContinue above) rather than a second,
              // independently-typed field, so a Daily Test's window can
              // never be created inconsistent with its own 24-hour
              // requirement.
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Closes</label>
                <p className="hm-input flex items-center text-[var(--color-text-muted)]">
                  {form.scheduled_start ? "Automatically, 24 hours after opening" : "Set an opening time first"}
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Scheduled end (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_end}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_end: e.target.value }))}
                  className="hm-input"
                />
              </div>
            )}
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
