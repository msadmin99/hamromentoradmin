"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const EDIT_FIELDS = [
  { key: "first_name", label: "First name", group: "user" },
  { key: "last_name", label: "Last name", group: "user" },
  { key: "phone", label: "Phone", group: "user" },
  { key: "program", label: "Program", group: "user" },
  { key: "course", label: "Course", group: "user" },
  { key: "college", label: "College", group: "profile" },
  { key: "district", label: "District", group: "profile" },
  { key: "province", label: "Province", group: "profile" },
  { key: "exam_target", label: "Exam target", group: "profile" },
  { key: "batch", label: "Batch", group: "profile" },
];

function EditStudentModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const f of EDIT_FIELDS) {
      initial[f.key] = f.group === "profile" ? student.profile?.[f.key] || "" : student[f.key] || "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      // Only send fields that actually changed — the backend logs exactly
      // what it's told changed, so an untouched field shouldn't appear in
      // the audit trail as a same-value no-op.
      const payload = {};
      for (const f of EDIT_FIELDS) {
        const current = f.group === "profile" ? student.profile?.[f.key] || "" : student[f.key] || "";
        if (form[f.key] !== current) payload[f.key] = form[f.key];
      }
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      await api.patch(`/auth/users/${student.id}/edit/`, payload);
      onSaved();
    } catch (err) {
      if (err.data && typeof err.data === "object") {
        const fe = {};
        for (const [k, v] of Object.entries(err.data)) {
          if (EDIT_FIELDS.some((f) => f.key === k)) fe[k] = Array.isArray(v) ? v[0] : v;
        }
        setFieldErrors(fe);
        if (Object.keys(fe).length === 0) setError(err.message);
      } else {
        setError(err.message || "Could not save changes.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit — ${student.first_name} ${student.last_name}`.trim()} onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Only the fields below can be edited here. Email, password, and financial/enrollment data are not editable
          from this form.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EDIT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                disabled={saving}
                className="hm-input w-full text-sm"
              />
              {fieldErrors[f.key] && <p className="mt-1 text-[11px] font-medium text-brand-red">{fieldErrors[f.key]}</p>}
            </div>
          ))}
        </div>

        {error && <p className="text-sm font-medium text-brand-red">{error}</p>}

        <div className="mt-2 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="hm-btn-outline">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="hm-btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "academics", label: "Academics" },
  { key: "enrollments", label: "Enrollments" },
  { key: "payments", label: "Payments" },
  { key: "activity", label: "Activity" },
  { key: "devices", label: "Devices" },
];

const PURCHASE_STATUS_META = {
  unpaid: { label: "Awaiting Payment", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  pending: { label: "Pending Verification", className: "bg-yellow-100 text-yellow-800" },
  resubmission_requested: { label: "Resubmission Requested", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", className: "bg-brand-green-light text-brand-green" },
  rejected: { label: "Rejected", className: "bg-brand-red-light text-brand-red" },
  expired: { label: "Expired", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  cancelled: { label: "Cancelled", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
};

const MASTERY_META = {
  mastered: { label: "Mastered", className: "text-brand-green" },
  weak: { label: "Weak", className: "text-brand-red" },
  need_practice: { label: "Need Practice", className: "text-yellow-700" },
  learning: { label: "Learning", className: "text-brand-blue" },
  new: { label: "New", className: "text-[var(--color-text-muted)]" },
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="flex-none text-[var(--color-text-muted)]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[var(--color-text)]">{value ?? "—"}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="hm-card">
      {title && <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">{title}</p>}
      <div className="divide-y divide-[var(--color-border)]">{children}</div>
    </div>
  );
}

function OverviewTab({ student }) {
  const p = student.profile || {};
  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Personal Information">
        <InfoRow label="First name" value={student.first_name} />
        <InfoRow label="Last name" value={student.last_name} />
        <InfoRow label="District" value={p.district} />
        <InfoRow label="Province" value={p.province} />
      </SectionCard>

      <SectionCard title="Contact Information">
        <InfoRow label="Email" value={student.email} />
        <InfoRow label="Phone" value={student.phone} />
      </SectionCard>

      <SectionCard title="Account Information">
        <InfoRow label="Student ID" value={student.id} />
        <InfoRow label="Username" value={student.username} />
        <InfoRow label="Joined" value={formatDate(student.date_joined)} />
        <InfoRow
          label="Status"
          value={
            student.is_active ? (
              <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">Active</span>
            ) : (
              <span className="rounded-md bg-brand-red-light px-2 py-1 text-[10px] font-bold text-brand-red">Blocked</span>
            )
          }
        />
        <InfoRow label="Referral code" value={<span className="font-mono">{student.referral_code}</span>} />
        <InfoRow label="Wallet balance" value={`Rs. ${student.wallet_balance}`} />
        <InfoRow
          label="Referred by"
          value={
            student.referred_by ? (
              <Link href={`/students/${student.referred_by.id}`} className="text-brand-blue">
                {student.referred_by.name}
              </Link>
            ) : (
              "—"
            )
          }
        />
      </SectionCard>
    </div>
  );
}

function AcademicsTab({ student }) {
  const p = student.profile || {};
  return (
    <SectionCard title="Academic Information">
      <InfoRow label="Program" value={student.program} />
      <InfoRow label="Course (registered)" value={student.course} />
      <InfoRow label="Active course" value={student.active_course_detail?.name} />
      <InfoRow label="College" value={p.college} />
      <InfoRow label="Batch" value={p.batch} />
      <InfoRow label="Exam target" value={p.exam_target} />
    </SectionCard>
  );
}

function EnrollmentsTab({ student }) {
  const enrollments = student.enrollments || [];
  const requests = student.enrollment_requests || [];
  return (
    <div className="flex flex-col gap-4">
      <div className="hm-card overflow-x-auto">
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">
          Enrollments {enrollments.length >= 20 && <span className="font-normal text-[var(--color-text-muted)]">(latest 20)</span>}
        </p>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5">Course</th>
              <th className="whitespace-nowrap px-4 py-2.5">Package</th>
              <th className="whitespace-nowrap px-4 py-2.5">Batch</th>
              <th className="whitespace-nowrap px-4 py-2.5">Student Code</th>
              <th className="whitespace-nowrap px-4 py-2.5">Access</th>
              <th className="whitespace-nowrap px-4 py-2.5">Status</th>
              <th className="whitespace-nowrap px-4 py-2.5">Enrolled</th>
              <th className="whitespace-nowrap px-4 py-2.5">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {enrollments.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-[var(--color-text)]">{e.course_name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{e.package_name || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{e.batch_name || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{e.student_code || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 capitalize">{e.access_type}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {e.is_active ? (
                    <span className="text-xs font-semibold text-brand-green">Active</span>
                  ) : (
                    <span className="text-xs font-semibold text-brand-red">Inactive</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{formatDate(e.enrolled_at)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{formatDate(e.expires_at)}</td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No enrollments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="hm-card overflow-x-auto">
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">Enrollment Requests</p>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5">Course</th>
              <th className="whitespace-nowrap px-4 py-2.5">Package</th>
              <th className="whitespace-nowrap px-4 py-2.5">Status</th>
              <th className="whitespace-nowrap px-4 py-2.5">Submitted</th>
              <th className="whitespace-nowrap px-4 py-2.5">Decided</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-[var(--color-text)]">{r.course_name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{r.package_name || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 capitalize">{r.status}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{formatDate(r.submitted_at)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{formatDate(r.decided_at)}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No enrollment requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsTab({ student }) {
  const purchases = student.purchases || [];
  return (
    <div className="hm-card overflow-x-auto">
      <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">
        Payments {purchases.length >= 20 && <span className="font-normal text-[var(--color-text-muted)]">(latest 20)</span>}
      </p>
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5">Order</th>
            <th className="whitespace-nowrap px-4 py-2.5">Kind</th>
            <th className="whitespace-nowrap px-4 py-2.5">Item</th>
            <th className="whitespace-nowrap px-4 py-2.5">Amount</th>
            <th className="whitespace-nowrap px-4 py-2.5">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5">Reference</th>
            <th className="whitespace-nowrap px-4 py-2.5">Screenshot</th>
            <th className="whitespace-nowrap px-4 py-2.5">Decided</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {purchases.map((p) => {
            const meta = PURCHASE_STATUS_META[p.status] || { label: p.status, className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" };
            return (
              <tr key={p.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{p.order_id}</td>
                <td className="whitespace-nowrap px-4 py-2.5 capitalize">{p.kind.replace("_", " ")}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text)]">{p.item_name || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium">Rs. {p.final_amount}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{p.payment_reference || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{p.has_screenshot ? "Submitted" : "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">
                  {p.decided_at ? `${formatDate(p.decided_at)}${p.decided_by_name ? ` — ${p.decided_by_name}` : ""}` : "—"}
                </td>
              </tr>
            );
          })}
          {purchases.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                No payment history.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTab({ student }) {
  const a = student.activity_summary || {};
  const breakdown = a.mastery_breakdown || {};
  const recentAttempts = a.recent_test_attempts || [];
  return (
    <div className="flex flex-col gap-4">
      <div className="hm-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Questions Attempted</p>
          <p className="text-lg font-extrabold text-[var(--color-text)]">{a.questions_attempted ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Overall Accuracy</p>
          <p className="text-lg font-extrabold text-[var(--color-text)]">
            {a.overall_accuracy_pct != null ? `${a.overall_accuracy_pct}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Tests Taken</p>
          <p className="text-lg font-extrabold text-[var(--color-text)]">{a.tests_taken ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Avg Score</p>
          <p className="text-lg font-extrabold text-[var(--color-text)]">{a.avg_score ?? "—"}</p>
        </div>
      </div>

      <SectionCard title="QBank Mastery Breakdown">
        {Object.entries(MASTERY_META).map(([key, meta]) => (
          <InfoRow key={key} label={meta.label} value={<span className={`font-bold ${meta.className}`}>{breakdown[key] ?? 0}</span>} />
        ))}
      </SectionCard>

      <div className="hm-card overflow-x-auto">
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">
          Recent Test Attempts {recentAttempts.length >= 20 && <span className="font-normal text-[var(--color-text-muted)]">(latest 20)</span>}
        </p>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5">Test</th>
              <th className="whitespace-nowrap px-4 py-2.5">Type</th>
              <th className="whitespace-nowrap px-4 py-2.5">Score</th>
              <th className="whitespace-nowrap px-4 py-2.5">Accuracy</th>
              <th className="whitespace-nowrap px-4 py-2.5">Rank</th>
              <th className="whitespace-nowrap px-4 py-2.5">Status</th>
              <th className="whitespace-nowrap px-4 py-2.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {recentAttempts.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-[var(--color-text)]">{t.test_title}</td>
                <td className="whitespace-nowrap px-4 py-2.5 uppercase text-[var(--color-text-muted)]">{t.exam_type}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{t.score}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{t.accuracy}%</td>
                <td className="whitespace-nowrap px-4 py-2.5">{t.rank ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 capitalize">{t.status.replace("_", " ")}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{formatDateTime(t.start_time)}</td>
              </tr>
            ))}
            {recentAttempts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No test attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevicesTab({ student }) {
  const devices = student.devices || [];
  return (
    <div className="hm-card overflow-x-auto">
      <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">
        Devices — {student.device_count}/3
      </p>
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5">Device</th>
            <th className="whitespace-nowrap px-4 py-2.5">Last Seen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {devices.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-2.5 text-[var(--color-text)]">{d.device_label || "Unknown device"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-muted)]">{formatDateTime(d.last_seen)}</td>
            </tr>
          ))}
          {devices.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                No devices on record.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Maps a failed load's HTTP status to what the page shows — distinct from
// the raw backend error message, which stays out of the UI except for the
// generic 5xx/network case (nothing here is sensitive, but a plain "Not
// found."/"Forbidden." from the API is less useful to an admin than a
// concrete next step).
function errorStateFor(status) {
  if (status === 401) {
    return {
      title: "Authentication required",
      message: "Your session has expired. Please log in again.",
      retry: false,
    };
  }
  if (status === 403) {
    return {
      title: "Permission denied",
      message: "You don't have permission to view this student.",
      retry: false,
    };
  }
  if (status === 404) {
    return {
      title: "Student not found",
      message: "This student doesn't exist or may have been removed.",
      retry: false,
    };
  }
  return {
    title: "Unable to load student",
    message: "Something went wrong loading this student's details.",
    retry: true,
  };
}

function StudentDetailContent() {
  const params = useParams();
  const [student, setStudent] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [toggling, setToggling] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  function load() {
    setLoading(true);
    setErrorStatus(null);
    api
      .get(`/auth/users/${params.id}/detail/`)
      .then(setStudent)
      // A network failure (backend unreachable, DNS, offline) never reaches
      // apiFetch's `error.status` assignment — status stays undefined,
      // which errorStateFor() already treats as the generic 5xx/network case.
      .catch((err) => setErrorStatus(err.status || 0))
      .finally(() => setLoading(false));
  }

  useEffect(load, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive() {
    if (!student) return;
    setToggling(true);
    try {
      await api.patch(`/auth/users/${student.id}/`, { is_active: !student.is_active });
      load();
    } finally {
      setToggling(false);
    }
  }

  function handleEditSaved() {
    setShowEdit(false);
    setSavedMsg("Changes saved.");
    load(); // refresh displayed data — `tab` state is untouched, so the current tab stays selected
    setTimeout(() => setSavedMsg(""), 4000);
  }

  return (
    <div className="p-6">
      <Link href="/students" className="text-xs font-semibold text-brand-blue">
        ← Back to Students
      </Link>

      {loading && <p className="mt-4 text-sm text-[var(--color-text-muted)]">Loading…</p>}
      {errorStatus !== null && !loading && (() => {
        const state = errorStateFor(errorStatus);
        return (
          <div className="mt-4 rounded-lg bg-brand-red-light px-4 py-3">
            <p className="text-sm font-bold text-brand-red">{state.title}</p>
            <p className="mt-0.5 text-sm text-brand-red">{state.message}</p>
            <div className="mt-2 flex items-center gap-3">
              {state.retry && (
                <button onClick={load} className="text-xs font-semibold text-brand-red underline">
                  Try again
                </button>
              )}
              <Link href="/students" className="text-xs font-semibold text-brand-red underline">
                Back to Students
              </Link>
            </div>
          </div>
        );
      })()}
      {savedMsg && <p className="mt-4 rounded-lg bg-brand-green-light px-3 py-2 text-sm font-medium text-brand-green">{savedMsg}</p>}

      {student && (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue text-lg font-bold text-white">
                {(student.first_name?.[0] || student.email?.[0] || "?").toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[var(--color-text)]">
                    {student.first_name} {student.last_name}
                  </h1>
                  {student.is_active ? (
                    <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">Active</span>
                  ) : (
                    <span className="rounded-md bg-brand-red-light px-2 py-1 text-[10px] font-bold text-brand-red">Blocked</span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{student.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowEdit(true)} className="hm-btn-outline">
                Edit
              </button>
              <button onClick={toggleActive} disabled={toggling} className="hm-btn-outline">
                {toggling ? "Working…" : student.is_active ? "Block" : "Unblock"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "border-brand-blue text-brand-blue"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "overview" && <OverviewTab student={student} />}
            {tab === "academics" && <AcademicsTab student={student} />}
            {tab === "enrollments" && <EnrollmentsTab student={student} />}
            {tab === "payments" && <PaymentsTab student={student} />}
            {tab === "activity" && <ActivityTab student={student} />}
            {tab === "devices" && <DevicesTab student={student} />}
          </div>
        </>
      )}

      {showEdit && student && (
        <EditStudentModal student={student} onClose={() => setShowEdit(false)} onSaved={handleEditSaved} />
      )}
    </div>
  );
}

export default function StudentDetailPage() {
  return (
    <RequireStaff feature="students">
      <Shell>
        <StudentDetailContent />
      </Shell>
    </RequireStaff>
  );
}
