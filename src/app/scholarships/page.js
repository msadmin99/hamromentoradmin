"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const PRODUCT_TABS = [
  { key: "qbank", label: "Question Bank" },
  { key: "daily_test", label: "Daily Test" },
  { key: "mock_test", label: "Mock Test" },
  { key: "video", label: "Video Lectures" },
];

const DURATION_UNITS = [
  { key: "day", label: "Day(s)" },
  { key: "week", label: "Week(s)" },
  { key: "month", label: "Month(s)" },
  { key: "year", label: "Year(s)" },
];

function emptyForm() {
  return {
    student: null,
    course_id: "",
    product_type: "qbank",
    plan_id: "",
    duration_value: 1,
    duration_unit: "month",
    reason: "",
  };
}

function ScholarshipsContent() {
  const [scholarships, setScholarships] = useState([]);
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get("/scholarships/")
      .then(setScholarships)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);
  useEffect(() => {
    api.get("/courses/").then(setCourses);
  }, []);

  useEffect(() => {
    if (!studentSearch) {
      setStudentResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/auth/users/?search=${encodeURIComponent(studentSearch)}`).then(setStudentResults);
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  useEffect(() => {
    if (!form.course_id) {
      setPlans([]);
      return;
    }
    api.get(`/subscription-plans/?course=${form.course_id}&product_type=${form.product_type}`).then(setPlans);
  }, [form.course_id, form.product_type]);

  function openCreate() {
    setForm(emptyForm());
    setStudentSearch("");
    setStudentResults([]);
    setError("");
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.student) {
      setError("Select a student first.");
      return;
    }
    if (!form.course_id) {
      setError("Select a course.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post("/grant-access/", {
        user_id: form.student.id,
        course_id: Number(form.course_id),
        product_type: form.product_type,
        plan_id: form.plan_id ? Number(form.plan_id) : null,
        duration_value: Number(form.duration_value),
        duration_unit: form.duration_unit,
        reason: form.reason,
        is_scholarship: true,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function revoke(s) {
    if (!confirm(`Revoke ${s.user_name}'s scholarship? Their access will end immediately.`)) return;
    await api.post(`/scholarships/${s.id}/revoke/`, {});
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🎓 Scholarships</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Grant free access to a course/product for a student — zero revenue, excluded from analytics.
          </p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Grant scholarship
        </button>
      </div>

      <div className="mt-4 hm-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Student</th>
              <th className="whitespace-nowrap px-4 py-3">Course</th>
              <th className="whitespace-nowrap px-4 py-3">Product</th>
              <th className="whitespace-nowrap px-4 py-3">Reason</th>
              <th className="whitespace-nowrap px-4 py-3">Granted by</th>
              <th className="whitespace-nowrap px-4 py-3">Granted</th>
              <th className="whitespace-nowrap px-4 py-3">Expires</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {scholarships.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">
                  {s.user_name}
                  <div className="text-xs text-[var(--color-text-muted)]">{s.user_email}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{s.course_name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                  {PRODUCT_TABS.find((t) => t.key === s.product_type)?.label || s.product_type}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{s.reason || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{s.granted_by_name || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                  {new Date(s.granted_at).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                  {s.subscription_expires_at ? new Date(s.subscription_expires_at).toLocaleDateString() : "No expiry"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {s.is_active ? (
                    <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">Active</span>
                  ) : (
                    <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">
                      Revoked
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {s.is_active && (
                    <button onClick={() => revoke(s)} className="text-xs font-semibold text-brand-red">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && scholarships.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No scholarships granted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          {scholarships.length} total
        </div>
      </div>

      {showForm && (
        <Modal title="Grant scholarship" onClose={() => setShowForm(false)} wide>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Student</label>
              {form.student ? (
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-2.5 text-sm">
                  <span>
                    {form.student.first_name} {form.student.last_name}{" "}
                    <span className="text-[var(--color-text-muted)]">({form.student.email})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, student: null }))}
                    className="text-xs font-semibold text-brand-blue"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search name, email, phone, or ID…"
                    className="hm-input"
                  />
                  {studentResults.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)]">
                      {studentResults.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setForm((f) => ({ ...f, student: s }));
                            setStudentResults([]);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                        >
                          {s.first_name} {s.last_name} <span className="text-[var(--color-text-muted)]">({s.email})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Course</label>
                <select
                  required
                  value={form.course_id}
                  onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value, plan_id: "" }))}
                  className="hm-input"
                >
                  <option value="">Select course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Product</label>
                <select
                  value={form.product_type}
                  onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value, plan_id: "" }))}
                  className="hm-input"
                >
                  {PRODUCT_TABS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                Base on an existing plan (optional — sets validity/quota, not price)
              </label>
              <select value={form.plan_id} onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))} className="hm-input">
                <option value="">No plan — custom duration below</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Duration</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.duration_value}
                  onChange={(e) => setForm((f) => ({ ...f, duration_value: e.target.value }))}
                  className="hm-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Unit</label>
                <select
                  value={form.duration_unit}
                  onChange={(e) => setForm((f) => ({ ...f, duration_unit: e.target.value }))}
                  className="hm-input"
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Reason</label>
              <input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="hm-input"
                placeholder="e.g. Merit scholarship, financial hardship…"
              />
            </div>

            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Granting…" : "Grant scholarship"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function ScholarshipsPage() {
  return (
    <RequireStaff feature="students">
      <Shell>
        <ScholarshipsContent />
      </Shell>
    </RequireStaff>
  );
}
