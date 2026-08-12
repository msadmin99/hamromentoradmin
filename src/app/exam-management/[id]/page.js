"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const SESSION_STATUS_META = {
  draft: { label: "Draft", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-brand-blue" },
  registration_open: { label: "Registration Open", className: "bg-blue-50 text-brand-blue" },
  live: { label: "Live", className: "bg-brand-green-light text-brand-green" },
  completed: { label: "Completed", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  cancelled: { label: "Cancelled", className: "bg-brand-red-light text-brand-red" },
};

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function InfoTile({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function EditSessionModal({ session, onClose, onSaved }) {
  const [form, setForm] = useState({
    start_datetime: session.start_datetime.slice(0, 16),
    end_datetime: session.end_datetime.slice(0, 16),
    registration_deadline: session.registration_deadline ? session.registration_deadline.slice(0, 16) : "",
    max_attempts: session.max_attempts,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/exam-sessions/${session.id}/`, {
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
        max_attempts: Number(form.max_attempts),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit Schedule — ${session.session_name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Start</label>
          <input
            type="datetime-local"
            value={form.start_datetime}
            onChange={(e) => setForm((f) => ({ ...f, start_datetime: e.target.value }))}
            className="hm-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">End</label>
          <input
            type="datetime-local"
            value={form.end_datetime}
            onChange={(e) => setForm((f) => ({ ...f, end_datetime: e.target.value }))}
            className="hm-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Registration deadline (optional)</label>
          <input
            type="datetime-local"
            value={form.registration_deadline}
            onChange={(e) => setForm((f) => ({ ...f, registration_deadline: e.target.value }))}
            className="hm-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Max attempts</label>
          <input
            type="number"
            min={1}
            value={form.max_attempts}
            onChange={(e) => setForm((f) => ({ ...f, max_attempts: e.target.value }))}
            className="hm-input w-32"
          />
        </div>
        {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
        <button onClick={save} disabled={saving} className="hm-btn-primary mt-2">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function ParticipantsModal({ session, onClose }) {
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    api.get(`/exam-sessions/${session.id}/attempts/`).then(setAttempts);
  }, [session.id]);

  return (
    <Modal title={`${session.status === "completed" ? "Results" : "Participants"} — ${session.session_name}`} onClose={onClose} wide>
      {!attempts && <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>}
      {attempts && attempts.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No participants yet.</p>}
      {attempts && attempts.length > 0 && (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-[var(--color-text-muted)]">
              <tr>
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Accuracy</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 pr-3">
                    <p className="font-medium text-[var(--color-text)]">{a.user_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{a.user_email}</p>
                  </td>
                  <td className="py-2 pr-3">{a.score}/{a.total_marks}</td>
                  <td className="py-2 pr-3">{a.rank ?? "—"}</td>
                  <td className="py-2 pr-3">{a.accuracy}%</td>
                  <td className="py-2 pr-3 capitalize">{a.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function SessionRow({ session, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const meta = SESSION_STATUS_META[session.status] || SESSION_STATUS_META.draft;
  const editable = ["scheduled", "registration_open"].includes(session.status);

  async function cancel() {
    if (!confirm(`Cancel ${session.session_name}? Students will no longer be able to start it.`)) return;
    await api.post(`/exam-sessions/${session.id}/cancel/`, {});
    onChanged();
  }

  return (
    <div className="hm-card flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-semibold text-[var(--color-text)]">{session.session_name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{formatDateTime(session.start_datetime)}</p>
        <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
        {session.status === "completed" && (
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">
            {session.participant_count} Participant{session.participant_count === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5 text-xs font-semibold">
        {session.status === "completed" && (
          <button onClick={() => setViewing(true)} className="text-brand-blue">
            View Results
          </button>
        )}
        {editable && (
          <>
            <button onClick={() => setEditing(true)} className="text-brand-blue">
              Edit Schedule
            </button>
            <button onClick={() => setViewing(true)} className="text-brand-blue">
              View Participants
            </button>
            <button onClick={cancel} className="text-brand-red">
              Cancel
            </button>
          </>
        )}
        {session.status === "live" && (
          <button onClick={() => setViewing(true)} className="text-brand-blue">
            View Participants
          </button>
        )}
      </div>
      {editing && <EditSessionModal session={session} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />}
      {viewing && <ParticipantsModal session={session} onClose={() => setViewing(false)} />}
    </div>
  );
}

function ExamDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get(`/tests/${id}/`)
      .then(async (t) => {
        setTest(t);
        if (t.exam_template) {
          const s = await api.get(`/exam-templates/${t.exam_template}/sessions/`);
          setSessions(s);
        } else {
          setSessions([]);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading || !test) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={() => router.push("/exam-management")} className="mb-3 text-xs font-semibold text-[var(--color-text-muted)]">
        ← Back to Exam Management
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">{test.title}</h1>
          {test.exam_code && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Exam ID: {test.exam_code}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/exam-management/${id}/reschedule`} className="hm-btn-primary">
            {sessions.length > 0 ? "🔄 Reschedule" : "Schedule"}
          </Link>
        </div>
      </div>

      <div className="hm-card mt-4 grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <InfoTile label="Questions" value={test.question_count} />
        <InfoTile label="Duration" value={`${test.duration_minutes} Minutes`} />
        <InfoTile label="Total Marks" value={test.total_marks} />
        <InfoTile label="Negative Marking" value={test.negative_marking ? "Yes" : "No"} />
      </div>

      <div className="mt-6">
        <h2 className="text-base font-bold text-[var(--color-text)]">Schedule History</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Every session this exam has been scheduled for — completed sessions and their results are permanent.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onChanged={load} />
          ))}
          {sessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
              This exam has not been scheduled through a session yet.{" "}
              <Link href={`/exam-management/${id}/reschedule`} className="font-semibold text-brand-blue">
                Schedule it now →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExamDetailPage() {
  return (
    <RequireStaff feature="test_series">
      <Shell>
        <ExamDetailContent />
      </Shell>
    </RequireStaff>
  );
}
