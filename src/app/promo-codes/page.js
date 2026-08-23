"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const APPLIES_TO = [
  { key: "all", label: "Entire store" },
  { key: "qbank", label: "Question Bank Subscription" },
  { key: "daily_test", label: "Daily Test Subscription" },
  { key: "mock_test", label: "Mock Test Package" },
  { key: "grand_test", label: "Grand Test" },
  { key: "pyq", label: "Past Year Questions Subscription" },
];

const DISCOUNT_TYPES = [
  { key: "percentage", label: "Percentage" },
  { key: "fixed", label: "Fixed amount (Rs.)" },
  { key: "free_exam", label: "Free Exam" },
  { key: "free_subscription", label: "Free Subscription" },
  { key: "free_grand_test", label: "Free Grand Test" },
];
const FREE_DISCOUNT_TYPES = ["free_exam", "free_subscription", "free_grand_test"];

const ELIGIBILITY = [
  { key: "everyone", label: "Everyone" },
  { key: "registered", label: "Registered Users Only" },
  { key: "first_purchase", label: "First Purchase Only" },
  { key: "new_students", label: "New Students" },
  { key: "specific_emails", label: "Specific Email Addresses" },
];

function emptyForm() {
  return {
    code: "", name: "", courseIds: [], discount_type: "percentage", discount_value: 10, applies_to: "all",
    start_date: "", expiry_date: "", max_uses: "", max_uses_per_user: 1,
    min_purchase_amount: "", max_discount_amount: "", first_purchase_only: false,
    eligibility: "everyone", eligible_emails: "", new_student_days: 30, auto_apply: false, is_active: true,
  };
}

function PromoCodesContent() {
  const [coupons, setCoupons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get("/coupons/").then(setCoupons).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    api.get("/courses/").then(setCourses);
  }, []);

  const coursesByGroup = useMemo(() => {
    const acc = {};
    courses.forEach((c) => {
      const group = c.program_group || "Other";
      (acc[group] = acc[group] || []).push(c);
    });
    return acc;
  }, [courses]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setShowForm(true);
  }

  function toggleCourseId(id) {
    const key = String(id);
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(key) ? f.courseIds.filter((c) => c !== key) : [...f.courseIds, key],
    }));
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({
      code: c.code, name: c.name || "", courseIds: (c.courses || []).map(String), discount_type: c.discount_type,
      discount_value: c.discount_value, applies_to: c.applies_to,
      start_date: c.start_date || "", expiry_date: c.expiry_date || "",
      max_uses: c.max_uses ?? "", max_uses_per_user: c.max_uses_per_user,
      min_purchase_amount: c.min_purchase_amount ?? "", max_discount_amount: c.max_discount_amount ?? "",
      first_purchase_only: c.first_purchase_only, eligibility: c.eligibility,
      eligible_emails: c.eligible_emails || "", new_student_days: c.new_student_days,
      auto_apply: c.auto_apply, is_active: c.is_active,
    });
    setError("");
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const isFree = FREE_DISCOUNT_TYPES.includes(form.discount_type);
    const { courseIds, ...rest } = form;
    const payload = {
      ...rest,
      code: form.code.toUpperCase().trim(),
      courses: courseIds.map(Number),
      discount_value: isFree ? 0 : Number(form.discount_value),
      max_uses: form.max_uses === "" ? null : Number(form.max_uses),
      max_uses_per_user: Number(form.max_uses_per_user),
      min_purchase_amount: form.min_purchase_amount === "" ? null : Number(form.min_purchase_amount),
      max_discount_amount: form.max_discount_amount === "" ? null : Number(form.max_discount_amount),
      new_student_days: Number(form.new_student_days),
      start_date: form.start_date || null,
      expiry_date: form.expiry_date || null,
    };
    try {
      if (editingId) {
        await api.patch(`/coupons/${editingId}/`, payload);
      } else {
        await api.post("/coupons/", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCoupon(id) {
    if (!confirm("Delete this promo code?")) return;
    await api.del(`/coupons/${id}/`);
    load();
  }

  const isFreeType = FREE_DISCOUNT_TYPES.includes(form.discount_type);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">🏷️ Promo Codes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Discount &amp; free-access codes, scoped by course and exam type — students see the price update live at checkout.
          </p>
        </div>
        <button onClick={openCreate} className="hm-btn-primary">
          + Create Promo Code
        </button>
      </div>

      <div className="mt-4 hm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3">Eligibility</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-semibold text-[var(--color-text)]">
                  {c.code}
                  {c.auto_apply && (
                    <span className="ml-1.5 rounded bg-brand-blue/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-blue">AUTO</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.discount_type === "percentage" && `${c.discount_value}%`}
                  {c.discount_type === "fixed" && `Rs. ${c.discount_value}`}
                  {FREE_DISCOUNT_TYPES.includes(c.discount_type) && (
                    <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">
                      {DISCOUNT_TYPES.find((d) => d.key === c.discount_type)?.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{(c.course_names || []).join(", ") || "All courses"}</td>
                <td className="px-4 py-3 text-xs">{APPLIES_TO.find((a) => a.key === c.applies_to)?.label}</td>
                <td className="px-4 py-3 text-xs">{ELIGIBILITY.find((e) => e.key === c.eligibility)?.label}</td>
                <td className="px-4 py-3">
                  {c.usage_count}
                  {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </td>
                <td className="px-4 py-3">
                  {c.is_active ? (
                    <span className="rounded-md bg-brand-green-light px-2 py-1 text-[10px] font-bold text-brand-green">ACTIVE</span>
                  ) : (
                    <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">
                      OFF
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(c)} className="mr-3 text-xs font-semibold text-brand-blue">
                    Edit
                  </button>
                  <button onClick={() => removeCoupon(c.id)} className="text-xs font-semibold text-brand-red">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No promo codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editingId ? "Edit promo code" : "Create promo code"} onClose={() => setShowForm(false)} wide>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Code</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="hm-input font-mono"
                  placeholder="e.g. FIRST20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Name (optional)</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="hm-input" />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)]">Course (blank = all courses)</label>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      courseIds: f.courseIds.length === courses.length ? [] : courses.map((c) => String(c.id)),
                    }))
                  }
                  className="text-[11px] font-semibold text-brand-blue"
                >
                  {form.courseIds.length === courses.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] p-3">
                {Object.entries(coursesByGroup).map(([group, list]) => (
                  <div key={group} className="mb-2 last:mb-0">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{group}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {list.map((c) => (
                        <label key={c.id} className="flex items-center gap-1.5 text-xs text-[var(--color-text)]">
                          <input
                            type="checkbox"
                            checked={form.courseIds.includes(String(c.id))}
                            onChange={() => toggleCourseId(c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                {form.courseIds.length === 0
                  ? "Applies to all courses"
                  : `Applies to ${form.courseIds.length} selected course${form.courseIds.length > 1 ? "s" : ""}`}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Applies to (exam type)</label>
              <select
                value={form.applies_to}
                onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
                className="hm-input"
              >
                {APPLIES_TO.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Discount type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
                  className="hm-input"
                >
                  {DISCOUNT_TYPES.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              {!isFreeType && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Discount value</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                    className="hm-input"
                  />
                </div>
              )}
            </div>
            {isFreeType && (
              <p className="-mt-1 rounded-lg bg-brand-green-light px-3 py-2 text-xs text-brand-green">
                This gives 100% off — a purchase using this code is activated immediately, no manual payment review needed.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Start date (optional)</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="hm-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Expiry date (optional)</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                  className="hm-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Max total uses (blank = unlimited)</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  className="hm-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Max uses per student</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))}
                  className="hm-input"
                />
              </div>
            </div>

            {!isFreeType && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Minimum purchase (Rs., optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.min_purchase_amount}
                    onChange={(e) => setForm((f) => ({ ...f, min_purchase_amount: e.target.value }))}
                    className="hm-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Max discount cap (Rs., optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.max_discount_amount}
                    onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value }))}
                    className="hm-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">Eligibility</label>
              <select
                value={form.eligibility}
                onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))}
                className="hm-input"
              >
                {ELIGIBILITY.map((el) => (
                  <option key={el.key} value={el.key}>
                    {el.label}
                  </option>
                ))}
              </select>
              {form.eligibility === "registered" && (
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Every purchase already requires being logged in, so this behaves the same as &quot;Everyone&quot; today.
                </p>
              )}
            </div>

            {form.eligibility === "specific_emails" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                  Eligible email addresses (comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={form.eligible_emails}
                  onChange={(e) => setForm((f) => ({ ...f, eligible_emails: e.target.value }))}
                  className="hm-input"
                  placeholder="student1@example.com, student2@example.com"
                />
              </div>
            )}

            {form.eligibility === "new_students" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">
                  Counts as "new" for this many days after registration
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.new_student_days}
                  onChange={(e) => setForm((f) => ({ ...f, new_student_days: e.target.value }))}
                  className="hm-input w-40"
                />
              </div>
            )}

            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span>
                <span className="font-semibold text-[var(--color-text)]">Auto-apply</span>
                <span className="block text-xs text-[var(--color-text-muted)]">
                  Applied automatically at checkout when the student hasn&apos;t typed a code — the best matching one wins.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.auto_apply}
                onChange={(e) => setForm((f) => ({ ...f, auto_apply: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">First purchase only</span>
              <input
                type="checkbox"
                checked={form.first_purchase_only}
                onChange={(e) => setForm((f) => ({ ...f, first_purchase_only: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] p-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Active</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            </label>

            {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
            <button type="submit" disabled={saving} className="hm-btn-primary mt-2">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create promo code"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function PromoCodesPage() {
  return (
    <RequireStaff feature="billing">
      <Shell>
        <PromoCodesContent />
      </Shell>
    </RequireStaff>
  );
}
