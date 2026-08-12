"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CoursePicker from "@/components/CoursePicker";
import Modal from "@/components/Modal";
import QuestionPicker from "@/components/QuestionPicker";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const ACCESS_OPTIONS = [
  { key: "all", label: "All eligible students" },
  { key: "course", label: "Specific course subscribers" },
  { key: "membership", label: "Specific membership" },
  { key: "batch", label: "Specific batch/group" },
  { key: "private", label: "Private/password protected" },
];

const ATTEMPT_OPTIONS = [1, 2, 3];

const REUSE_OPTIONS = [
  { key: "questions", label: "Same questions" },
  { key: "questionOrder", label: "Same question order" },
  { key: "correctAnswers", label: "Same correct answers" },
  { key: "marks", label: "Same marks" },
  { key: "negativeMarking", label: "Same negative marking" },
  { key: "duration", label: "Same duration" },
  { key: "instructions", label: "Same instructions" },
  { key: "navigation", label: "Same question navigation settings" },
  { key: "calculator", label: "Same calculator settings" },
  { key: "randomization", label: "Same randomization settings" },
];

function defaultReuseConfig() {
  return Object.fromEntries(REUSE_OPTIONS.map((o) => [o.key, true]));
}

function InfoTile({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function RescheduleContent() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessionCount, setSessionCount] = useState(0);

  const [sessionName, setSessionName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [timezone, setTimezone] = useState("Asia/Kathmandu");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [accessType, setAccessType] = useState("all");
  const [accessCourseIds, setAccessCourseIds] = useState([]);
  const [password, setPassword] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [maxAttemptsUnlimited, setMaxAttemptsUnlimited] = useState(false);

  const [reuseConfig, setReuseConfig] = useState(defaultReuseConfig());
  const [newQuestions, setNewQuestions] = useState([]);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/courses/").then(setCourses);
    api.get("/subjects/").then(setSubjects);
    api.get(`/tests/${id}/`).then((t) => {
      setTest(t);
      setNewQuestions(t.questions || []);
      const loadSessions = t.exam_template
        ? api.get(`/exam-templates/${t.exam_template}/sessions/`)
        : Promise.resolve([]);
      loadSessions.then((sessions) => {
        // A never-before-scheduled Test gets a backfilled "Session 1" the
        // moment it's first rescheduled (see exam_versioning.adopt_test_into_template),
        // so the genuinely new session is always #2 in that case, not #1.
        const effectiveCount = t.exam_template ? sessions.length : 1;
        setSessionCount(effectiveCount);
        setSessionName(`${t.title} — Session ${effectiveCount + 1}`);
      });
    });
  }, [id]);

  const needsNewVersion = useMemo(() => Object.values(reuseConfig).some((v) => !v), [reuseConfig]);

  const endTime = useMemo(() => {
    if (!examDate || !startTime || !test) return null;
    const start = new Date(`${examDate}T${startTime}`);
    if (Number.isNaN(start.getTime())) return null;
    return new Date(start.getTime() + test.duration_minutes * 60000);
  }, [examDate, startTime, test]);

  function toggleReuse(key) {
    setReuseConfig((f) => ({ ...f, [key]: !f[key] }));
  }

  function validate() {
    if (!examDate || !startTime) return "Exam date and start time are required.";
    const start = new Date(`${examDate}T${startTime}`);
    if (start < new Date()) return "Cannot schedule an exam session in the past.";
    if (registrationDeadline && new Date(registrationDeadline) > start) {
      return "Registration deadline must be before the exam start time.";
    }
    if (accessType === "private" && !password.trim()) return "A password is required for private access.";
    if (needsNewVersion && reuseConfig.questions === false && newQuestions.length === 0) {
      return "Select at least one question for the new version.";
    }
    return "";
  }

  function openConfirm() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setShowConfirm(true);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    const start = new Date(`${examDate}T${startTime}`);
    try {
      await api.post(`/tests/${id}/reschedule/`, {
        session_name: sessionName,
        start_datetime: start.toISOString(),
        end_datetime: endTime.toISOString(),
        registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        timezone,
        access_type: accessType,
        access_course_ids: accessType === "course" ? accessCourseIds : undefined,
        password: accessType === "private" ? password : "",
        max_attempts: maxAttemptsUnlimited ? 999 : maxAttempts,
        new_version: needsNewVersion,
        new_version_question_ids: needsNewVersion && !reuseConfig.questions ? newQuestions.map((q) => q.id) : undefined,
      });
      router.push(`/exam-management/${id}`);
    } catch (err) {
      setError(err.message);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!test) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={() => router.push(`/exam-management/${id}`)} className="mb-3 text-xs font-semibold text-[var(--color-text-muted)]">
        ← Back
      </button>

      <h1 className="text-xl font-bold text-[var(--color-text)]">Reschedule Exam</h1>

      <div className="hm-card mt-4 grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <InfoTile label="Exam" value={test.title} />
        <InfoTile label="Exam ID" value={test.exam_code || "Not yet assigned"} />
        <InfoTile label="Questions" value={test.question_count} />
        <InfoTile label="Duration" value={`${test.duration_minutes} Minutes`} />
        <InfoTile label="Total Marks" value={test.total_marks} />
        <InfoTile label="Negative Marking" value={test.negative_marking ? "Yes" : "No"} />
        <InfoTile label="Original Session" value={test.scheduled_start ? new Date(test.scheduled_start).toLocaleDateString() : "Not scheduled"} />
        <InfoTile label="Status" value={sessionCount > 0 ? "Has previous sessions" : "Never scheduled"} />
      </div>

      <div className="hm-card mt-4 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">New Session</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Session Name</label>
            <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="hm-input" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Exam Date</label>
              <input type="date" min={todayStr()} value={examDate} onChange={(e) => setExamDate(e.target.value)} className="hm-input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="hm-input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">End Time</label>
              <input
                readOnly
                value={endTime ? endTime.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }) : ""}
                className="hm-input bg-[var(--color-surface-muted)]"
                placeholder="Calculated from duration"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Timezone</label>
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="hm-input" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Registration Deadline (optional)</label>
            <input
              type="datetime-local"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="hm-input max-w-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Student Access</label>
            <select value={accessType} onChange={(e) => setAccessType(e.target.value)} className="hm-input max-w-sm">
              {ACCESS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            {accessType === "course" && (
              <div className="mt-2">
                <CoursePicker courses={courses} selected={accessCourseIds} onChange={setAccessCourseIds} />
              </div>
            )}
            {accessType === "private" && (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Session password"
                className="hm-input mt-2 max-w-sm"
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Maximum Attempts</label>
            <div className="flex flex-wrap gap-2">
              {ATTEMPT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMaxAttempts(n);
                    setMaxAttemptsUnlimited(false);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    !maxAttemptsUnlimited && maxAttempts === n
                      ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {n} attempt{n > 1 ? "s" : ""}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMaxAttemptsUnlimited(true)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  maxAttemptsUnlimited ? "border-brand-blue bg-brand-blue/10 text-brand-blue" : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                Unlimited
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hm-card mt-4 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Reuse Exam Configuration</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REUSE_OPTIONS.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
              <input type="checkbox" checked={reuseConfig[o.key]} onChange={() => toggleReuse(o.key)} />
              {o.label}
            </label>
          ))}
        </div>

        {needsNewVersion && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">This exam already has previous attempts.</p>
            <p className="mt-1 text-xs">
              Changing questions or settings will create a new Exam Version so historical results remain unchanged. The
              original version and every session/attempt against it stay exactly as they are.
            </p>
            {!reuseConfig.questions && (
              <button
                type="button"
                onClick={() => setShowQuestionPicker(true)}
                className="mt-2 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
              >
                Create New Version — choose questions ({newQuestions.length} selected)
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-brand-red">{error}</p>}

      <div className="mt-4 flex justify-end gap-3">
        <button onClick={() => router.push(`/exam-management/${id}`)} className="hm-btn-outline">
          Cancel
        </button>
        <button onClick={openConfirm} className="hm-btn-primary">
          Review
        </button>
      </div>

      {showQuestionPicker && (
        <QuestionPicker
          subjects={subjects}
          initialQuestions={newQuestions}
          onCancel={() => setShowQuestionPicker(false)}
          onInsert={(qs) => {
            setNewQuestions(qs);
            setShowQuestionPicker(false);
          }}
        />
      )}

      {showConfirm && (
        <Modal title="Reschedule Exam?" onClose={() => setShowConfirm(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-base font-bold text-[var(--color-text)]">{test.title}</p>
            <div className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm">
              <p className="font-semibold text-[var(--color-text)]">New Session:</p>
              <p className="text-[var(--color-text-muted)]">
                {examDate && new Date(`${examDate}T${startTime}`).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <p className="text-[var(--color-text-muted)]">Questions: <span className="font-semibold text-[var(--color-text)]">{needsNewVersion && !reuseConfig.questions ? newQuestions.length : test.question_count}</span></p>
                <p className="text-[var(--color-text-muted)]">Duration: <span className="font-semibold text-[var(--color-text)]">{test.duration_minutes} Minutes</span></p>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              The existing exam and previous results will remain unchanged.
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {needsNewVersion
                ? "A new Exam Version will be created for this session."
                : "A new Exam Session will be created using the selected Exam Version."}
            </p>
            <div className="mt-2 flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="hm-btn-outline">
                Cancel
              </button>
              <button onClick={submit} disabled={submitting} className="hm-btn-primary">
                {submitting ? "Creating…" : "Create New Session"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ReschedulePage() {
  return (
    <RequireStaff feature="test_series">
      <Shell>
        <RescheduleContent />
      </Shell>
    </RequireStaff>
  );
}
